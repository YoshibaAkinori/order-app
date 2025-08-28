import json
from decimal import Decimal
import boto3

# --- 初期設定 ---
dynamodb = boto3.resource('dynamodb')
order_details_table = dynamodb.Table('OrderDetails')
config_table = dynamodb.Table('Configurations')
neta_master_table = dynamodb.Table('NetaMaster')

# テーブル名を動的に解決するためのヘルパー関数
TABLE_SUFFIXES = ['A', 'B', 'C']
def get_table_suffix(year):
    """年を元に、使用するテーブルのサフィックス(A, B, C)を決定する"""
    numeric_year = int(year)
    # 2024年を基準点 'C' とする
    start_year = 2022
    index = (numeric_year - start_year) % len(TABLE_SUFFIXES)
    return TABLE_SUFFIXES[index]

# DynamoDBのDecimal型をJSONに変換するためのヘルパー
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

# --- メインハンドラ ---
def lambda_handler(event, context):
    try:
        params = event.get('queryStringParameters', {})
        date_str = params.get('date')
        target_wariate_name = params.get('route')

        if not date_str or not target_wariate_name:
            return {'statusCode': 400, 'body': json.dumps({'message': 'Date and route parameters are required.'})}
        
        day_to_find = date_str.split('-')[2]
        year_to_find = date_str.split('-')[0]

        table_suffix = get_table_suffix(year_to_find)
        order_details_table = dynamodb.Table(f'OrderDetails-{table_suffix}')

        # --- 1. 必要なマスターデータをDBから取得 ---
        config_response = config_table.get_item(Key={'configYear': year_to_find})
        if 'Item' not in config_response:
            return {'statusCode': 404, 'body': json.dumps({'message': f'Config for {year_to_find} not found.'})}
        
        config = config_response['Item']
        products_master = config.get('products', {})
        special_menus_master = config.get('specialMenus', {})
        delivery_wariate_master = config.get('deliveryWariate', [])
        
        neta_master_response = neta_master_table.scan()
        neta_master_list = neta_master_response.get('Items', [])

        # --- 2. 割り当ての親子関係を解決し、注文を絞り込み ---
        responsible_routes = []
        for wariate in delivery_wariate_master:
            if wariate.get('name') == target_wariate_name:
                responsible_routes = wariate.get('responsibleRoutes', [])
                break
        if not responsible_routes:
            responsible_routes = [target_wariate_name]

        details_response = order_details_table.scan(
            FilterExpression="begins_with(orderId, :day) AND assignedRoute IN (" + ", ".join([f":route{i}" for i in range(len(responsible_routes))]) + ")",
            ExpressionAttributeValues={
                ":day": day_to_find,
                **{f":route{i}": route for i, route in enumerate(responsible_routes)}
            }
        )
        filtered_orders = details_response.get('Items', [])

        # --- 3. 新しい8カテゴリの集計用データ構造 ---
        product_summary = {
            key: {
                'normal_wasabi': 0, 'normal_wasabi_ori': 0,
                'changed_wasabi': 0, 'changed_wasabi_ori': 0,
                'normal_nowasabi': 0, 'normal_nowasabi_ori': 0,
                'changed_nowasabi': 0, 'changed_nowasabi_ori': 0
            } 
            for key in products_master.keys()
        }
        neta_summary = {neta['netaName']: 0 for neta in neta_master_list}
        other_orders_summary = {}

        # --- 4. 絞り込んだ注文をループして詳細に集計 ---
        for order in filtered_orders:
            print(f"Processing order: {order.get('orderId', 'Unknown')}")
            
            for item in order.get('orderItems', []):
                key = item.get('productKey')
                total_qty = int(item.get('quantity', 0))
                if key not in products_master or total_qty == 0: 
                    continue
                
                print(f"  Processing product: {key}, total quantity: {total_qty}")
                
                neta_changes_patterns = order.get('netaChanges', {}).get(key, [])
                
                # ★★★ 修正された計算ロジック：一個一個を個別処理 ★★★
                processed_qty = 0  # 処理済み数量をトラック
                
                # --- 変更パターンを一個ずつ処理 ---
                for pattern_index, pattern in enumerate(neta_changes_patterns):
                    pattern_qty = int(pattern.get('quantity', 0))
                    is_ori = pattern.get('isOri', False)
                    wasabi_status = pattern.get('wasabi', 'あり')
                    selected_neta = pattern.get('selectedNeta', {})
                    
                    print(f"    Pattern {pattern_index}: qty={pattern_qty}, isOri={is_ori}, wasabi={wasabi_status}")
                    print(f"    Selected neta: {selected_neta}")
                    
                    # selectedNetaにキーが1つ以上存在する場合のみ「ネタ変」と判断
                    has_neta_change = len([k for k, v in selected_neta.items() if v]) > 0
                    
                    # 一個ずつカウント - 最も具体的なカテゴリに1回だけカウント
                    for i in range(pattern_qty):
                        processed_qty += 1
                        
                        # カテゴリ判定：最も具体的な属性の組み合わせに1つだけ分類
                        if has_neta_change:
                            # ネタ変更あり
                            if wasabi_status == '抜き':
                                if is_ori:
                                    product_summary[key]['changed_nowasabi_ori'] += 1
                                    print(f"      Individual {i+1}: changed_nowasabi_ori")
                                else:
                                    product_summary[key]['changed_nowasabi'] += 1
                                    print(f"      Individual {i+1}: changed_nowasabi")
                            else:
                                if is_ori:
                                    product_summary[key]['changed_wasabi_ori'] += 1
                                    print(f"      Individual {i+1}: changed_wasabi_ori")
                                else:
                                    product_summary[key]['changed_wasabi'] += 1
                                    print(f"      Individual {i+1}: changed_wasabi")
                        else:
                            # ネタ変更なし（ワサビ変更のみ、または折のみ）
                            if wasabi_status == '抜き':
                                if is_ori:
                                    product_summary[key]['normal_nowasabi_ori'] += 1
                                    print(f"      Individual {i+1}: normal_nowasabi_ori")
                                else:
                                    product_summary[key]['normal_nowasabi'] += 1
                                    print(f"      Individual {i+1}: normal_nowasabi")
                            else:
                                if is_ori:
                                    product_summary[key]['normal_wasabi_ori'] += 1
                                    print(f"      Individual {i+1}: normal_wasabi_ori")
                                else:
                                    product_summary[key]['normal_wasabi'] += 1
                                    print(f"      Individual {i+1}: normal_wasabi")
                    
                    # ネタ変更の詳細集計
                    if has_neta_change:
                        for neta_name, is_selected in selected_neta.items():
                            if is_selected and neta_name in neta_summary:
                                neta_summary[neta_name] += pattern_qty
                                print(f"    Added {pattern_qty} to neta: {neta_name}")

                # --- 変更されなかった「通常（さび入り）」の分を集計 ---
                normal_qty = total_qty - processed_qty
                if normal_qty > 0:
                    print(f"    Adding {normal_qty} normal items")
                    # 変更がないものは「折」にはなり得ない
                    product_summary[key]['normal_wasabi'] += normal_qty

            # --- サイドオーダーの集計 ---
            for side_item in order.get('sideOrders', []):
                key = side_item.get('productKey')
                qty = int(side_item.get('quantity', 0))
                if key and qty > 0:
                    item_name = special_menus_master.get(key, {}).get('name', key)
                    other_orders_summary[item_name] = other_orders_summary.get(item_name, 0) + qty
                    print(f"  Side order: {item_name} +{qty}")

        # --- デバッグ用：最終集計結果をログ出力 ---
        print("=== FINAL SUMMARY ===")
        for product_key, counts in product_summary.items():
            if any(count > 0 for count in counts.values()):
                product_name = products_master.get(product_key, {}).get('name', product_key)
                print(f"{product_name} ({product_key}):")
                for category, count in counts.items():
                    if count > 0:
                        print(f"  {category}: {count}")

        print("=== NETA SUMMARY ===")
        for neta_name, count in neta_summary.items():
            if count > 0:
                print(f"{neta_name}: {count}")

        # --- 5. 最終データを構築 ---
        final_summary = {
            'product_summary': product_summary,
            'neta_summary': neta_summary,
            'other_orders_summary': other_orders_summary,
            'filtered_orders': filtered_orders,
            'masters': { 
                'products': products_master,
                'specialMenus': special_menus_master,
                'netaMaster': neta_master_list
             }
        }
        
        return {
            'statusCode': 200,
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps(final_summary, cls=DecimalEncoder)
        }
    except Exception as e:
        print(f"An error occurred: {e}")
        return {'statusCode': 500, 'body': json.dumps({'message': f'An error occurred: {str(e)}'})}