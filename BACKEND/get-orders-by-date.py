import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')

# ★★★ ここからが変更点 ★★★
# テーブル名を動的に解決するためのヘルパー関数
TABLE_SUFFIXES = ['A', 'B', 'C']
def get_table_suffix(year):
    """年を元に、使用するテーブルのサフィックス(A, B, C)を決定する"""
    numeric_year = int(year)
    # 2024年を基準点 'A' とする
    start_year = 2022
    index = (numeric_year - start_year) % len(TABLE_SUFFIXES)
    return TABLE_SUFFIXES[index]
# ★★★ 変更ここまで ★★★


# Decimal型をJSONに変換するためのヘルパー
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    try:
        date_str = event.get('pathParameters', {}).get('date')
        # ★★★ 変更点: クエリパラメータから年を取得 ★★★
        year = event.get('queryStringParameters', {}).get('year')

        if not date_str or not year:
            return {'statusCode': 400, 'body': json.dumps({'message': 'Date and Year parameters are required.'})}
        
        # ★★★ 変更点: テーブル名を動的に生成 ★★★
        table_suffix = get_table_suffix(year)
        order_details_table = dynamodb.Table(f'OrderDetails-{table_suffix}')

        day_to_find = date_str.split('-')[2]

        # Scanで全件取得
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