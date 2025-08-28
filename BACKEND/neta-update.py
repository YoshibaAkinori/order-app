import json
import boto3
from decimal import Decimal

# --- 初期設定 ---

# DynamoDBのクライアントを初期化
dynamodb = boto3.resource('dynamodb')
neta_master_table = dynamodb.Table('NetaMaster')

# Decimal型をJSONに変換するためのカスタムエンコーダークラス
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            else:
                return float(obj)
        return super(DecimalEncoder, self).default(obj)

# --- 各処理のヘルパー関数 ---

def handle_get_all(event):
    """ 全てのネタマスタを取得 (GET /neta-master) """
    try:
        response = neta_master_table.scan()
        items = response.get('Items', [])
        return {
            'statusCode': 200,
            'headers': { 
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps(items, cls=DecimalEncoder)
        }
    except Exception as e:
        print(f"[ERROR] handle_get_all: {e}")
        return { 'statusCode': 500, 'body': json.dumps({'message': 'Error getting neta master.'}) }

def handle_create(event):
    """ 新しいネタを作成 (POST /neta-master) """
    try:
        data = json.loads(event.get('body', '{}'))
        neta_name = data.get('netaName')
        if not neta_name:
            return { 'statusCode': 400, 'body': json.dumps({'message': 'netaName is required.'}) }
        
        neta_master_table.put_item(Item=data)
        return {
            'statusCode': 201, # Created
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps(data)
        }
    except Exception as e:
        print(f"[ERROR] handle_create: {e}")
        return { 'statusCode': 500, 'body': json.dumps({'message': 'Error creating neta.'}) }

def handle_update(event, neta_name):
    """ 既存のネタを更新 (PUT /neta-master/{netaName}) """
    try:
        data = json.loads(event.get('body', '{}'))
        data['netaName'] = neta_name
        
        neta_master_table.put_item(Item=data)
        return {
            'statusCode': 200,
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps(data)
        }
    except Exception as e:
        print(f"[ERROR] handle_update: {e}")
        return { 'statusCode': 500, 'body': json.dumps({'message': 'Error updating neta.'}) }

def handle_delete(event, neta_name):
    """ 既存のネタを削除 (DELETE /neta-master/{netaName}) """
    try:
        neta_master_table.delete_item(Key={'netaName': neta_name})
        return {
            'statusCode': 200,
            'headers': { 'Access-Control-Allow-Origin': '*' },
            'body': json.dumps({'message': f'Neta {neta_name} deleted.'})
        }
    except Exception as e:
        print(f"[ERROR] handle_delete: {e}")
        return { 'statusCode': 500, 'body': json.dumps({'message': 'Error deleting neta.'}) }

# --- メインのハンドラ（交通整理役） ---

def lambda_handler(event, context):
    path = event.get('rawPath')
    method = event.get('requestContext', {}).get('http', {}).get('method')
    path_params = event.get('pathParameters') or {}
    neta_name = path_params.get('netaName')
    
    # パスの末尾にスラッシュがあってもなくても同じように扱うための正規化
    if path and path != '/' and path.endswith('/'):
        path = path[:-1]

    print(f"Received request: Method={method}, Path={path}, netaName={neta_name}")

    # メソッドとパスに応じて、処理を振り分ける
    if path == '/neta-master':
        if method == 'GET':
            return handle_get_all(event)
        elif method == 'POST':
            return handle_create(event)
            
    elif path and path.startswith('/neta-master/') and neta_name:
        if method == 'PUT':
            return handle_update(event, neta_name)
        elif method == 'DELETE':
            return handle_delete(event, neta_name)

    # どのルートにも当てはまらない場合は404を返す
    return {
        'statusCode': 404,
        'headers': { 
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        'body': json.dumps({'message': 'Not Found'})
    }