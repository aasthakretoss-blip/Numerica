import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const PERMISSIONS_TABLE = process.env.PERMISSIONS_TABLE;

export const handler = async (event) => {
    console.log('Pre Token Generation event:', JSON.stringify(event, null, 2));
    
    try {
        const userSub = event.request.userAttributes.sub;
        
        if (!userSub) {
            console.log('No user sub found, skipping permissions injection');
            return event;
        }
        
        // Query DynamoDB for user permissions
        const getItemParams = {
            TableName: PERMISSIONS_TABLE,
            Key: {
                user_sub: { S: userSub }
            }
        };
        
        console.log('Querying DynamoDB for user permissions:', userSub);
        
        const command = new GetItemCommand(getItemParams);
        const result = await dynamoClient.send(command);
        
        if (result.Item) {
            // Extract permissions from DynamoDB response
            const role = result.Item.role?.S || 'user';
            const canUpload = result.Item.can_upload?.S || 'false';
            const canViewFunds = result.Item.can_view_funds?.S || 'false';
            
            console.log(`Found permissions for user ${userSub}:`, {
                role,
                canUpload,
                canViewFunds
            });
            
            // Add custom claims to the token
            event.response = {
                claimsOverrideDetails: {
                    claimsToAddOrOverride: {
                        'custom:role': role,
                        'custom:can_upload': canUpload,
                        'custom:can_view_funds': canViewFunds,
                        'custom:permissions_loaded': 'true'
                    }
                }
            };
            
            console.log('Successfully added custom claims to token');
        } else {
            console.log(`No permissions found for user ${userSub}, using defaults`);
            
            // Set default permissions if no record found
            event.response = {
                claimsOverrideDetails: {
                    claimsToAddOrOverride: {
                        'custom:role': 'user',
                        'custom:can_upload': 'false',
                        'custom:can_view_funds': 'false',
                        'custom:permissions_loaded': 'false'
                    }
                }
            };
        }
        
    } catch (error) {
        console.error('Error in Pre Token Generation:', error);
        
        // On error, set minimal permissions to avoid blocking login
        event.response = {
            claimsOverrideDetails: {
                claimsToAddOrOverride: {
                    'custom:role': 'user',
                    'custom:can_upload': 'false',
                    'custom:can_view_funds': 'false',
                    'custom:permissions_loaded': 'error'
                }
            }
        };
    }
    
    return event;
};
