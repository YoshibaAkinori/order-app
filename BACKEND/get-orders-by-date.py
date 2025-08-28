import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
order_details_table = dynamodb.Table('OrderDetails')

# Decimal型をJSONに変換するためのヘルパー
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    try:
        date_str = event.get('pathParameters', {}).get('date')
        if not date_str:
            return {'statusCode': 400, 'body': json.dumps({'message': 'Date parameter is required.'})}
        
        # URLの日付 'YYYY-MM-DD' から 'DD' (日) の部分だけを抜き出す
        day_to_find = date_str.split('-')[2]

        # Scanで全件取得 (注意: データ量が多い場合は非効率)
        response = order_details_table.scan()
        all_orders = response.get('Items', [])
        
        # orderIdの先頭2桁が指定された日付と一致するものをフィルタリング
        filtered_orders = [
            order for order in all_orders 
            if order.get('orderId', '').startswith(day_to_find)
        ]

        return {
            'statusCode': 200,
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps(filtered_orders, cls=DecimalEncoder)
        }
    except Exception as e:
        print(e)
        return {'statusCode': 500, 'body': json.dumps({'message': f'An error occurred: {e}'})}
