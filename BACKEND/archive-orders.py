import json
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')

# --- テーブル名の定義 ---
ORDERS_TABLE = 'Orders'
ORDER_DETAILS_TABLE = 'OrderDetails'
ORDER_LOG = 'OrderChangeLogs'
ARCHIVE_ORDERS_TABLE = 'Orders_pre'
ARCHIVE_DETAILS_TABLE = 'OrderDetails_pre'

# --- ヘルパー関数 (変更なし) ---
def copy_table_data(source_table_name, dest_table_name):
    """テーブルの全データをコピーする"""
    source_table = dynamodb.Table(source_table_name)
    dest_table = dynamodb.Table(dest_table_name)
    
    # Scanで全件取得
    response = source_table.scan()
    items = response.get('Items', [])
    
    # Batch Writerで効率的に書き込み
    with dest_table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)
            
    # もしデータが大量でページ分割されている場合も考慮
    while 'LastEvaluatedKey' in response:
        response = source_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items = response.get('Items', [])
        with dest_table.batch_writer() as batch:
            for item in items:
                batch.put_item(Item=item)
    print(f"Copied data from {source_table_name} to {dest_table_name}")

def clear_table_data(table_name):
    """テーブルの全データを削除する"""
    table = dynamodb.Table(table_name)
    
    # Scanで全件のキーを取得
    scan = table.scan(ProjectionExpression="receptionNumber, orderId") # OrderDetailsの場合
    if 'orderId' not in scan.get('Items', [{}])[0]:
         scan = table.scan(ProjectionExpression="receptionNumber") # Ordersの場合
         
    # Batch Writerで効率的に削除
    with table.batch_writer() as batch:
        for each in scan['Items']:
            batch.delete_item(Key=each)
            
    while 'LastEvaluatedKey' in scan:
        scan = table.scan(ProjectionExpression="receptionNumber, orderId", ExclusiveStartKey=scan['LastEvaluatedKey'])
        if 'orderId' not in scan.get('Items', [{}])[0]:
             scan = table.scan(ProjectionExpression="receptionNumber", ExclusiveStartKey=scan['LastEvaluatedKey'])
        with table.batch_writer() as batch:
            for each in scan['Items']:
                batch.delete_item(Key=each)
    print(f"Cleared all data from {table_name}")

# --- メインハンドラ ---
def lambda_handler(event, context):
    print("Starting yearly archive process...")
    try:
        # 1. まず、既存のアーカイブテーブルを空にする
        print(f"Clearing previous archive tables: {ARCHIVE_ORDERS_TABLE}, {ARCHIVE_DETAILS_TABLE}")
        clear_table_data(ARCHIVE_ORDERS_TABLE)
        clear_table_data(ARCHIVE_DETAILS_TABLE)
        
        # 2. 現在のテーブルからアーカイブテーブルへデータをコピー
        print(f"Copying data from {ORDERS_TABLE} to {ARCHIVE_ORDERS_TABLE}")
        copy_table_data(ORDERS_TABLE, ARCHIVE_ORDERS_TABLE)
        
        print(f"Copying data from {ORDER_DETAILS_TABLE} to {ARCHIVE_DETAILS_TABLE}")
        copy_table_data(ORDER_DETAILS_TABLE, ARCHIVE_DETAILS_TABLE)
        
        # 3. コピーが成功したら、現在のテーブルを初期化
        print(f"Clearing current tables: {ORDERS_TABLE}, {ORDER_DETAILS_TABLE}")
        clear_table_data(ORDERS_TABLE)
        clear_table_data(ORDER_DETAILS_TABLE)
        clear_table_data(ORDER_LOG)
        
        print("Archive process completed successfully.")
        return {
            'statusCode': 200,
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps({'message': 'Successfully archived and cleared current order data.'})
        }

    except Exception as e:
        print(f"[ERROR] An unexpected error occurred: {e}")
        # 処理の途中で失敗した場合は、現在のデータは削除されない
        return {'statusCode': 500, 'body': json.dumps({'message': f'An unexpected error occurred: {e}'})}