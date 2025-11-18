# AWS Infrastructure Setup for IMPECKS-AI

## Prerequisites
- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js 18+

## 1. AWS Cognito Setup

### Create User Pool
```bash
aws cognito-idp create-user-pool \
  --pool-name IMPECKS-AI-Users \
  --auto-verified-attributes email \
  --username-attributes email \
  --schema Name=email,AttributeDataType=String,Required=true \
  --schema Name=name,AttributeDataType=String,Required=false \
  --policies PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=true}
```

### Create App Client
```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id YOUR_USER_POOL_ID \
  --client-name IMPECKS-AI-Web \
  --generate-secret \
  --explicit-auth-flows ALLOW_ADMIN_USER_PASSWORD_AUTH,ALLOW_REFRESH_TOKEN_AUTH \
  --token-validity RefreshToken=30,AccessToken=1,IDToken=1
```

### Create Identity Pool (Optional for S3 access)
```bash
aws cognito-identity create-identity-pool \
  --identity-pool-name IMPECKS-AI-Identity \
  --allow-unauthenticated-identities false \
  --cognito-identity-providers ProviderId=cognito-idp.us-east-1.amazonaws.com/YOUR_USER_POOL_ID,ClientId=YOUR_CLIENT_ID
```

## 2. DynamoDB Tables Setup

### Users Table
```bash
aws dynamodb create-table \
  --table-name impecks-users \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Subscriptions Table
```bash
aws dynamodb create-table \
  --table-name impecks-subscriptions \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Usage Logs Table
```bash
aws dynamodb create-table \
  --table-name impecks-usage-logs \
  --attribute-definitions AttributeName=id,AttributeType=S AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes IndexName=userId-index,KeySchema=[{AttributeName=userId,KeyType=HASH}],Projection={ProjectionType=ALL} \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Workspaces Table
```bash
aws dynamodb create-table \
  --table-name impecks-workspaces \
  --attribute-definitions AttributeName=id,AttributeType=S AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes IndexName=userId-index,KeySchema=[{AttributeName=userId,KeyType=HASH}],Projection={ProjectionType=ALL} \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Workspace Files Table
```bash
aws dynamodb create-table \
  --table-name impecks-workspace-files \
  --attribute-definitions AttributeName=id,AttributeType=S AttributeName=workspaceId,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes IndexName=workspaceId-index,KeySchema=[{AttributeName=workspaceId,KeyType=HASH}],Projection={ProjectionType=ALL} \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Projects Table
```bash
aws dynamodb create-table \
  --table-name impecks-projects \
  --attribute-definitions AttributeName=id,AttributeType=S AttributeName=workspaceId,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes IndexName=workspaceId-index,KeySchema=[{AttributeName=workspaceId,KeyType=HASH}],Projection={ProjectionType=ALL} \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

## 3. S3 Bucket Setup (Optional for file storage)

```bash
aws s3 mb s3://impecks-file-storage --region us-east-1

# Configure CORS
aws s3api put-bucket-cors --bucket impecks-file-storage --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "MaxAgeSeconds": 3000
    }
  ]
}'
```

## 4. IAM Roles and Policies

### Create IAM Role for Lambda Functions
```bash
aws iam create-role \
  --role-name IMPECKS-AI-Lambda-Role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'
```

### Attach Policies
```bash
aws iam attach-role-policy \
  --role-name IMPECKS-AI-Lambda-Role \
  --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess

aws iam attach-role-policy \
  --role-name IMPECKS-AI-Lambda-Role \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDB_FullAccess

aws iam attach-role-policy \
  --role-name IMPECKS-AI-Lambda-Role \
  --policy-arn arn:aws:iam::aws:policy/AmazonCognitoPowerAdmin
```

## 5. Environment Configuration

Create `.env.local` file with your AWS credentials:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key

# Cognito Configuration
AWS_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
AWS_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_COGNITO_IDENTITY_POOL_ID=us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# DynamoDB Tables
DYNAMODB_USERS_TABLE=impecks-users
DYNAMODB_SUBSCRIPTIONS_TABLE=impecks-subscriptions
DYNAMODB_USAGE_LOGS_TABLE=impecks-usage-logs
DYNAMODB_WORKSPACES_TABLE=impecks-workspaces
DYNAMODB_WORKSPACE_FILES_TABLE=impecks-workspace-files
DYNAMODB_PROJECTS_TABLE=impecks-projects

# S3 Configuration
AWS_S3_BUCKET=impecks-file-storage
AWS_S3_REGION=us-east-1

# AI Services
ZAI_API_KEY=your-z-ai-api-key

# Application
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

## 6. Testing the Setup

### Test Cognito User Creation
```bash
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username test@example.com \
  --user-attributes Name=email,Value=test@example.com Name=name,Value=Test User

aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username test@example.com \
  --password YourPassword123! \
  --permanent
```

### Test DynamoDB
```bash
aws dynamodb put-item \
  --table-name impecks-users \
  --item '{"id":{"S":"test@example.com"},"email":{"S":"test@example.com"},"name":{"S":"Test User"},"role":{"S":"user"},"createdAt":{"S":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"},"updatedAt":{"S":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"}}'
```

## 7. Production Deployment Considerations

### Security
- Enable VPC endpoints for DynamoDB and Cognito
- Use AWS KMS for encryption at rest
- Enable AWS CloudTrail for audit logging
- Set up AWS Config rules for compliance

### Performance
- Enable DynamoDB Auto Scaling
- Use DynamoDB Accelerator (DAX) for read-heavy workloads
- Implement caching with ElastiCache Redis
- Set up CloudFront CDN for static assets

### Monitoring
- Enable AWS CloudWatch metrics and alarms
- Set up AWS X-Ray for distributed tracing
- Monitor DynamoDB read/write capacity
- Track Cognito user pool metrics

### Backup and Disaster Recovery
- Enable DynamoDB point-in-time recovery
- Set up cross-region replication
- Implement automated backup strategies
- Create disaster recovery procedures

## 8. Cost Optimization

- Use DynamoDB on-demand billing for variable workloads
- Implement data archiving for old usage logs
- Use S3 lifecycle policies for file storage
- Monitor AWS Cost Explorer for spending patterns

## 9. Next Steps

After setting up the AWS infrastructure:

1. Update your `.env.local` with the actual values
2. Test the authentication flow
3. Verify database operations
4. Set up monitoring and alerting
5. Configure CI/CD pipeline with AWS CodePipeline or GitHub Actions
6. Set up production deployment with AWS Amplify or Vercel

## Troubleshooting

### Common Issues
- **Cognito User Pool Not Found**: Verify the user pool ID is correct
- **DynamoDB Access Denied**: Check IAM permissions and table names
- **Token Verification Failed**: Ensure JWT tokens are properly configured
- **CORS Errors**: Update CORS configuration for S3 and API Gateway

### Debug Commands
```bash
# Check Cognito user pool
aws cognito-idp describe-user-pool --user-pool-id YOUR_USER_POOL_ID

# List DynamoDB tables
aws dynamodb list-tables --region us-east-1

# Check table status
aws dynamodb describe-table --table-name impecks-users --region us-east-1

# Test IAM permissions
aws sts get-caller-identity
```