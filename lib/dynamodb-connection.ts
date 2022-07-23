import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';

export class DynamoDBConnection {
  public static dynamodbClient: DynamoDBClient = null;

  public static confingurations(config: DynamoDBClientConfig) {
    this.dynamodbClient = new DynamoDBClient(config);
  }

  public static destroy() {
    if (this.dynamodbClient) {
      this.dynamodbClient.destroy();
    }
    this.dynamodbClient = null;
  }
}
