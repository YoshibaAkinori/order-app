import json
import boto3

dynamodb = boto3.resource('dynamodb')
order_details_table = dynamodb.Table('OrderDetails')

def lambda_handler(event, context):
    try:
        # 1. リクエストから日付と割り当て情報を取得
        date_str = event.get('pathParameters', {}).get('date')
        assignments = json.loads(event.get('body', '{}'))
        
        if not date_str or not assignments:
            return {'statusCode': 400, 'body': json.dumps({'message': 'Date and assignments data are required.'})}
        
        day_to_find = date_str.split('-')[2]

        # 2. 該当する日の注文を全てスキャン
        response = order_details_table.scan(
            FilterExpression="begins_with(orderId, :day)",
            ExpressionAttributeValues={":day": day_to_find}
        )
        orders_to_update = response.get('Items', [])
        
        update_count = 0
        # 3. 各注文をループし、割り当て情報を追加して更新
        for order in orders_to_update:
            prefix = order.get('orderId', '')[2]
            floor = order.get('orderId', '')[3]
            floor_key = f"{prefix}-{floor}"
            
            # 階層ごとの割り当てがあればそれを優先、なければ全体の割り当てを見る
            assigned_route = assignments.get(floor_key) or assignments.get(prefix)
            
            # 例外注文（個別対応）の場合の割り当てを取得
            if not assigned_route:
                assigned_route = assignments.get(order.get('orderId'))

            if assigned_route:
                # UpdateItemを使って、'assignedRoute'属性を追加・更新
                order_details_table.update_item(
                    Key={
                        'receptionNumber': order['receptionNumber'],
                        'orderId': order['orderId']
                    },
                    UpdateExpression="SET assignedRoute = :route",
                    ExpressionAttributeValues={
                        ':route': assigned_route
                    }
                )
                update_count += 1

        message = f"Successfully updated {update_count} orders with new assignments."
        return {
            'statusCode': 200,
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps({'message': message})
        }

    except Exception as e:
        print(e)
        return {'statusCode': 500, 'body': json.dumps({'message': f'An error occurred: {str(e)}'})}