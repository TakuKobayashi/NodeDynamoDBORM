import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders';
import { APIVersions, ConfigurationOptions } from 'aws-sdk/lib/config';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const AWS = require('aws-sdk');

export default abstract class DynamoDBORMBase {
  public dynamoClient: DocumentClient;
  public tableName: string;

  constructor(tableName: string) {
    this.dynamoClient = new AWS.DynamoDB.DocumentClient();
    this.tableName = tableName;
  }

  /**
   * update AWS Config;
   */
  static updateConfig(config: ConfigurationOptions & ConfigurationServicePlaceholders & APIVersions & { [key: string]: any }) {
    AWS.config.update(config);
  }
}
