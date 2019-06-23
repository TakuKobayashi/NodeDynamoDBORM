import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders';
import { APIVersions, ConfigurationOptions } from 'aws-sdk/lib/config';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const AWS = require('aws-sdk');

export default abstract class DynamoDBORMBase {
  public dynamoClient: DocumentClient;
  public tableName: string;
  private static awsConfig: { [key: string]: any };

  constructor(tableName: string) {
    const processEnv = process.env;
    if (!DynamoDBORMBase.awsConfig) {
      const defaultConfig: { [key: string]: any } = {
        region: processEnv.region,
        accessKeyId: processEnv.accessKeyId,
        secretAccessKey: processEnv.secretAccessKey,
      };
      if (processEnv.endpoint && processEnv.endpoint.length > 0) {
        defaultConfig.endpoint = new AWS.Endpoint(processEnv.endpoint);
      }
      const keys = Object.keys(defaultConfig);
      for (const key of keys) {
        if (!defaultConfig[key] || defaultConfig[key].length <= 0) {
          delete defaultConfig[key];
        }
      }
      DynamoDBORMBase.updateConfig(defaultConfig);
    }
    this.dynamoClient = new AWS.DynamoDB.DocumentClient();
    this.tableName = tableName;
  }

  /**
   * update AWS Config;
   */
  static updateConfig(config: ConfigurationOptions & ConfigurationServicePlaceholders & APIVersions & { [key: string]: any }) {
    this.awsConfig = config;
    AWS.config.update(config);
  }
}
