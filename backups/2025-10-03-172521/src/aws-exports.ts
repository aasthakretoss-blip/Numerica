const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_JwP9gBEvr',
      userPoolClientId: '18l43dor2k5fja5pu0caf64u2f',
      loginWith: {
        email: true
      }
    }
  }
};

export default awsConfig;
