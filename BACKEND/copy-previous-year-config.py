# yoshibaakinori/order-app/order-app-8e8445b07b62e3cdd230e64e794d4340ac1bdedf/BACKEND/copy-previous-year-config.py

import json
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
config_table = dynamodb.Table('Configurations')

# ★★★ ここから追加 ★★★
TABLE_SUFFIXES = ['A', 'B', 'C']

def get_table_suffix(year):
    """年を元に、使用するテーブルのサフィックス(A, B, C)を決定する"""
    numeric_year = int(year)
    start_year = 2022 # 計算の基準となる年 (2024年 -> A, 2025年 -> B, ...)
    index = (numeric_year - start_year) % len(TABLE_SUFFIXES)
    return TABLE_SUFFIXES[index]

def clear_table_data(table_name):
    """テーブルの全データを効率的に削除するヘルパー関数"""
    try:
        table = dynamodb.Table(table_name)
        # テーブルのキー情報を取得
        key_names = [key['AttributeName'] for key in table.key_schema]
        
        # まず全アイテムのキーをスキャンして取得
        scan_kwargs = {'ProjectionExpression': ', '.join(key_names)}
        items_to_delete = []
        done = False
        start_key = None
        while not done:
            if start_key:
                scan_kwargs['ExclusiveStartKey'] = start_key
            response = table.scan(**scan_kwargs)
            items_to_delete.extend(response.get('Items', []))
            start_key = response.get('LastEvaluatedKey', None)
            done = start_key is None

        # Batch Writerで効率的に削除
        if items_to_delete:
            with table.batch_writer() as batch:
                for item in items_to_delete:
                    batch.delete_item(Key=item)
        
        print(f"Successfully cleared all data from {table_name}")

    except ClientError as e:
        # テーブルが存在しない場合はエラーにせず、スキップする
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            print(f"Table {table_name} not found, skipping clearing process.")
        else:
            raise e
# ★★★ ここまで追加 ★★★

def lambda_handler(event, context):
    try:
        target_year_str = event.get('pathParameters', {}).get('year')
        if not target_year_str:
            return {'statusCode': 400, 'body': json.dumps({'message': 'Target year is missing.'})}
        
        target_year = int(target_year_str)
        source_year = str(target_year - 1)

        # 1. コピー元の設定データを取得
        response = config_table.get_item(Key={'configYear': source_year})
        source_config = response.get('Item')
        if not source_config:
            return {
                'statusCode': 404,
                'body': json.dumps({'message': f'{source_year}年の設定データが見つかりません。'})
            }

        # 2. 新しい年の設定データを作成
        new_config = source_config
        new_config['configYear'] = str(target_year)

        # 3. 新しい設定をDBに保存
        config_table.put_item(
            Item=new_config,
            ConditionExpression='attribute_not_exists(configYear)'
        )
        
        # 4. ★★★ 変更点: テーブルの自動初期化処理 ★★★
        # 新しい年に対応するテーブルサフィックスを計算
        suffix_to_clear = get_table_suffix(target_year_str)
        
        tables_to_clear = [
            f'Orders-{suffix_to_clear}',
            f'OrderDetails-{suffix_to_clear}',
            f'OrderChangeLogs-{suffix_to_clear}'
        ]
        
        print(f"New config for {target_year} created. Clearing tables with suffix -{suffix_to_clear} for reuse.")
        for table_name in tables_to_clear:
            clear_table_data(table_name)

        return {
            'statusCode': 201,
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps({'message': f'{source_year}年の設定を{target_year}年にコピーし、古いデータテーブルを初期化しました。'})
        }

    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            return {
                'statusCode': 409,
                'body': json.dumps({'message': f'{target_year}年の設定データは既に存在するため、処理を中断しました。'})
            }
        print(e)
        return {'statusCode': 500, 'body': json.dumps({'message': f'An error occurred: {e}'})}
    except Exception as e:
        print(e)
        return {'statusCode': 500, 'body': json.dumps({'message': f'An unexpected error occurred: {e}'})}