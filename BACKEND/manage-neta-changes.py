import json
import boto3
from decimal import Decimal

# --- 初期設定 ---
dynamodb = boto3.resource('dynamodb')
config_table = dynamodb.Table('Configurations')

# ★★★ ここからが変更点 ★★★
# テーブル名を動的に解決するためのヘルパー関数
TABLE_SUFFIXES = ['A', 'B', 'C']
def get_table_suffix(year):
    """年を元に、使用するテーブルのサフィックス(A, B, C)を決定する"""
    numeric_year = int(year)
    # 2024年を基準点 'C' とする
    start_year = 2022
    index = (numeric_year - start_year) % len(TABLE_SUFFIXES)
    return TABLE_SUFFIXES[index]
# ★★★ 変更ここまで ★★★


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

# --- メインハンドラ ---
def lambda_handler(event, context):
    method = event.get('requestContext', {}).get('http', {}).get('method')
    path = event.get('rawPath')
    
    print(f"Received request: Method={method}, Path={path}")

    # --- GET /neta-changes?date=...&route=...&year=... ---
    if method == 'GET' and path == '/neta-changes':
        try:
            params = event.get('queryStringParameters', {})
            date_str = params.get('date')
            target_route = params.get('route')
            year_to_find = params.get('year') # ★★★ 年を取得 ★★★
            
            if not date_str or not target_route or not year_to_find:
                return {'statusCode': 400, 'body': json.dumps({'message': 'Date, route, and year parameters are required.'})}
            
            # ★★★ 変更点: テーブル名を動的に生成 ★★★
            table_suffix = get_table_suffix(year_to_find)
            order_details_table = dynamodb.Table(f'OrderDetails-{table_suffix}')

            day_to_find = date_str.split('-')[2]
            
            config_response = config_table.get_item(Key={'configYear': year_to_find})
            if 'Item' not in config_response:
                return {'statusCode': 404, 'body': json.dumps({'message': f'Config for {year_to_find} not found.'})}
            config = config_response['Item']
            delivery_wariate_master = config.get('deliveryWariate', [])

            responsible_routes = []
            for wariate in delivery_wariate_master:
                if wariate.get('name') == target_route:
                    responsible_routes = wariate.get('responsibleRoutes', [])
                    break
            if not responsible_routes: responsible_routes = [target_route]

            details_response = order_details_table.scan(
                FilterExpression="begins_with(orderId, :day) AND assignedRoute IN (" + ", ".join([f":route{i}" for i in range(len(responsible_routes))]) + ")",
                ExpressionAttributeValues={":day": day_to_find, **{f":route{i}": route for i, route in enumerate(responsible_routes)}}
            )
            all_orders = details_response.get('Items', [])
            
            orders_with_structural_changes = []
            for order in all_orders:
                neta_changes = order.get('netaChanges', {})
                has_structural_change = False
                if neta_changes:
                    for product_key, patterns in neta_changes.items():
                        for pattern in patterns:
                            if pattern.get('selectedNeta') and len(pattern.get('selectedNeta', {}).keys()) > 0:
                                has_structural_change = True
                                break
                        if has_structural_change:
                            break
                
                if has_structural_change:
                    orders_with_structural_changes.append(order)

            return {'statusCode': 200, 'headers': { 'Access-Control-Allow-Origin': '*' }, 'body': json.dumps(orders_with_structural_changes, cls=DecimalEncoder)}

        except Exception as e:
            print(f"Error in GET /neta-changes: {e}")
            return {'statusCode': 500, 'body': json.dumps({'message': 'An error occurred.'})}

    # --- PUT /order-details/{receptionNumber}/{orderId} ---
    elif method == 'PUT' and path.startswith('/order-details/'):
        try:
            path_parts = path.strip('/').split('/')
            reception_number = path_parts[1]
            order_id = path_parts[2]
            
            request_body = json.loads(event.get('body', '{}'))
            new_neta_changes = request_body.get('netaChanges')
            year = request_body.get('year') # ★★★ 年をリクエストボディから取得 ★★★

            if new_neta_changes is None or not year:
                return {'statusCode': 400, 'body': json.dumps({'message': 'netaChanges and year are required.'})}

            # ★★★ 変更点: テーブル名を動的に生成 ★★★
            table_suffix = get_table_suffix(year)
            order_details_table = dynamodb.Table(f'OrderDetails-{table_suffix}')

            order_details_table.update_item(
                Key={'receptionNumber': reception_number, 'orderId': order_id},
                UpdateExpression="SET netaChanges = :val",
                ExpressionAttributeValues={':val': new_neta_changes}
            )
            
            return {'statusCode': 200, 'headers': { 'Access-Control-Allow-Origin': '*' }, 'body': json.dumps({'message': 'Neta changes updated successfully.'})}

        except Exception as e:
            print(f"Error in PUT /order-details: {e}")
            return {'statusCode': 500, 'body': json.dumps({'message': 'An error occurred during update.'})}

    return {'statusCode': 404, 'headers': { 'Access-Control-Allow-Origin': '*' }, 'body': json.dumps({'message': 'Not Found'})}