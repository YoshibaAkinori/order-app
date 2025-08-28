import json
from decimal import Decimal
import boto3
import urllib.parse
import unicodedata

# --- 初期設定 ---
dynamodb = boto3.resource('dynamodb')
orders_table = dynamodb.Table('Orders')
order_details_table = dynamodb.Table('OrderDetails')
config_table = dynamodb.Table('Configurations')

def normalize_text(text):
    if not text:
        return ''
    return unicodedata.normalize('NFKC', text).strip()

# --- Decimalを再帰的に変換 ---
def convert_decimals(obj):
    if isinstance(obj, list):
        return [convert_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    else:
        return obj

def lambda_handler(event, context):
    try:
        params = event.get('queryStringParameters', {})
        date_str = params.get('date')
        config_year = params.get('year')

        encoded_route = params.get('route')
        target_route = urllib.parse.unquote(encoded_route) if encoded_route else None
        normalized_route = normalize_text(target_route) if target_route else None

        print(f"[DEBUG] Raw route param: {encoded_route}")
        print(f"[DEBUG] Decoded route: {target_route}")
        print(f"[DEBUG] Normalized route: {normalized_route}")

        if not date_str or not config_year:
            return {'statusCode': 400, 'body': json.dumps({'message': 'Date and Year parameters are required.'})}

        day_to_find = date_str.split('-')[2]

        # --- 設定情報 ---
        config_response = config_table.get_item(Key={'configYear': config_year})
        if 'Item' not in config_response:
            return {'statusCode': 404, 'body': json.dumps({'message': f'Config for {config_year} not found.'})}
        config = config_response['Item']
        products_master = config.get('products', {})
        special_menus_master = config.get('specialMenus', {})

        # --- OrderDetails取得 ---
        details_response = order_details_table.scan(
            FilterExpression="begins_with(orderId, :day)",
            ExpressionAttributeValues={":day": day_to_find}
        )
        all_day_orders = details_response.get('Items', [])

        print(f"[DEBUG] Total orders fetched: {len(all_day_orders)}")
        if len(all_day_orders) > 0:
            print(f"[DEBUG] Sample order: {json.dumps(all_day_orders[0], ensure_ascii=False, default=str)}")

        # --- routeフィルタ ---
        if normalized_route:
            details = [
                order for order in all_day_orders
                if normalize_text(order.get('assignedRoute')) == normalized_route
            ]
        else:
            details = all_day_orders

        print(f"[DEBUG] Orders after route filter: {len(details)}")

        # --- 親注文取得 ---
        reception_numbers = {item['receptionNumber'] for item in details if 'receptionNumber' in item}
        parents_data = {}
        if reception_numbers:
            batch_keys = {'Orders': {'Keys': [{'receptionNumber': rn} for rn in reception_numbers]}}
            parent_response = dynamodb.batch_get_item(RequestItems=batch_keys)
            parents_data = {item['receptionNumber']: item for item in parent_response['Responses']['Orders']}

        # --- 結合 ---
        combined_orders = []
        for detail in details:
            parent = parents_data.get(detail.get('receptionNumber'), {})
            customer_info = parent.get('customerInfo', {})

            receipt_type = parent.get('receipts', [{}])[0].get('documentType', '')
            recipient_name = parent.get('receipts', [{}])[0].get('recipientName', '')

            enriched_order_items = []
            for item in detail.get('orderItems', []):
                item['change_patterns'] = detail.get('netaChanges', {}).get(item.get('productKey'), [])
                enriched_order_items.append(item)

            enriched_side_orders = []
            for side_item in detail.get('sideOrders', []):
                key = side_item.get('productKey')
                if key:
                    side_item['name'] = special_menus_master.get(key, {}).get('name', key)
                enriched_side_orders.append(side_item)

            combined_order = {
                'orderId': detail.get('orderId'),
                'receptionNumber': detail.get('receptionNumber'),
                'deliveryAddress': detail.get('deliveryAddress'),
                'deliveryTime': detail.get('deliveryTime'),
                'assignedRoute': detail.get('assignedRoute'),
                'contactName': customer_info.get('contactName'),
                'tel': customer_info.get('tel'),
                'receipts': parent.get('receipts', []),
                'orderItems': enriched_order_items,
                'sideOrders': enriched_side_orders,
                'orderTotal': detail.get('orderTotal'),
                'notes': parent.get('globalNotes'),
                'sequence': detail.get('sequence'),
                'paymentGroups': parent.get('paymentGroups', []),
            }
            combined_orders.append(combined_order)

        combined_orders.sort(key=lambda x: x.get('sequence', 0))

        final_response = {
            'orders': combined_orders,
            'masters': {'products': products_master}
        }

        # ✅ Decimalを全て変換
        safe_response = convert_decimals(final_response)

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(safe_response, ensure_ascii=False)
        }

    except Exception as e:
        print(f"[ERROR] An error occurred: {e}")
        return {'statusCode': 500, 'body': json.dumps({'message': f'An error occurred: {str(e)}'})}
