import { Amplify } from 'aws-amplify';

export const configureAmplify = () => {
  console.log('configureAmplify関数が呼ばれました');
  
  const config = {
    Auth: {
      Cognito: {
        // 必須項目
        userPoolId: 'ap-northeast-1_dXBR7zYvv',
        userPoolClientId: '5c8pti42sf55n2v1vrbc93agvi',
        
        // 追加の設定項目
        loginWith: {
          email: true,
          username: true
        },
        signUpVerificationMethod: 'code',
        userAttributes: {
          email: {
            required: true
          }
        },
        allowGuestAccess: true,
        passwordFormat: {
          minLength: 8,
          requireNumbers: true,
          requireLowercase: true,
          requireUppercase: true,
          requireSymbols: false
        }
      }
    }
  };
  
  try {
    Amplify.configure(config);
    console.log('✅ Amplify.configure実行完了:', config);
    
    // 設定確認のためのテスト
    console.log('Auth設定確認:', config.Auth.Cognito);
    
  } catch (error) {
    console.error('❌ Amplify設定失敗:', error);
  }
  
  console.log('Amplify設定が完了しました');
};