import json
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Configurations')

def lambda_handler(event, context):
    try:
        # URLから、作成したい年 (例: "2025") を取得
        target_year_str = event.get('pathParameters', {}).get('year')
        if not target_year_str:
            return {'statusCode': 400, 'body': json.dumps({'message': 'Target year is missing.'})}
        
        target_year = int(target_year_str)
        source_year = str(target_year - 1) # コピー元の年

        # 1. コピー元のデータ (去年の設定) を取得
        try:
            response = table.get_item(Key={'configYear': source_year})
            source_config = response.get('Item')
            if not source_config:
                return {
                    'statusCode': 404,
                    'body': json.dumps({'message': f'{source_year}年の設定データが見つかりません。'})
                }
        except ClientError as e:
            print(f"Error getting source config: {e}")
            raise e

        # 2. 新しいデータ (今年のデータ) を作成
        new_config = source_config
        new_config['configYear'] = str(target_year) # 年だけを新しいものに書き換える

        # 3. 今年のデータとしてDBに保存
        table.put_item(
            Item=new_config,
            # 今年のデータが既に存在する場合は、上書きしないようにする条件式
            ConditionExpression='attribute_not_exists(configYear)'
        )
        
        return {
            'statusCode': 201, # Created
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps({'message': f'{source_year}年のデータを{target_year}年にコピーしました。'})
        }

    except ClientError as e:
        # ConditionExpressionの条件に失敗した場合 (データが既に存在する場合)
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            return {
                'statusCode': 409, # Conflict
                'body': json.dumps({'message': f'{target_year}年の設定データは既に存在するため、コピーできません。'})
            }
        print(e)
        return {'statusCode': 500, 'body': json.dumps({'message': 'An error occurred during the copy process.'})}
    except Exception as e:
        print(e)
        return {'statusCode': 500, 'body': json.dumps({'message': 'An unexpected error occurred.'})}