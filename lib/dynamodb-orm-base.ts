import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders';
import { APIVersions, ConfigurationOptions } from 'aws-sdk/lib/config';
import { DocumentClient, TableDescription } from 'aws-sdk/clients/dynamodb';
import DynamoDBORMRelation from './dynamodb-orm-relation';
import QueryInput = DocumentClient.QueryInput;

const AWS = require('aws-sdk');

export default abstract class DynamoDBORMBase {
  public dynamoClient: DocumentClient;
  public tableName: string;
  public tableInfo: TableDescription;
  private static awsConfig: { [key: string]: any };
  private static tableInfos: { [tableName: string]: TableDescription };

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

    if(!DynamoDBORMBase.tableInfos){
      DynamoDBORMBase.tableInfos = {}
    }

    if (DynamoDBORMBase.tableInfos[tableName]) {
      this.tableInfo = DynamoDBORMBase.tableInfos[tableName];
    } else {
      this.loadTableInfo().then((tableInfo) => {
        DynamoDBORMBase.tableInfos[this.tableName] = tableInfo;
      });
    }
  }

  abstract where(filterObject: { [s: string]: any }): DynamoDBORMRelation;

  abstract offset(offsetStart: { [s: string]: any }): DynamoDBORMRelation;

  abstract async count(): Promise<Number>;

  abstract async exists(filterObject: { [s: string]: any }): Promise<boolean>;

  abstract async limit(limitNumaber: number): Promise<Map<string, any>[]>;

  protected async loadTableInfo() {
    const dynamoDB = new AWS.DynamoDB();
    const tableInfo = await dynamoDB.describeTable({ TableName: this.tableName }).promise();
    this.tableInfo = tableInfo.Table;
    return tableInfo.Table;
  }

  protected async generateFilterQueryExpression(filterObject: { [s: string]: any }): Promise<Partial<QueryInput>>{
    const attrNames = Object.keys(filterObject);
    const keyConditionExpressionFactors = [];
    const filterExpressionFactors = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    for (const attrName of attrNames) {
      const placeHolderAttrName = ['#', attrName].join("")
      const placeHolderAttrValue = [':', attrName].join("")
      expressionAttributeNames[placeHolderAttrName] = attrName;
      expressionAttributeValues[placeHolderAttrValue] = filterObject[attrName];
      if(await this.isPrimaryKey(attrName)){
        keyConditionExpressionFactors.push([placeHolderAttrName, placeHolderAttrValue].join(' = '))
      }else{
        filterExpressionFactors.push([placeHolderAttrName, placeHolderAttrValue].join(' = '))
      }
    }

    const keyConditionExpression = keyConditionExpressionFactors.join(' AND ');
    const filterExpression = filterExpressionFactors.join(' AND ');
    const result :Partial<QueryInput> = {
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    };
    if(filterExpression.length > 0){
      result.FilterExpression = filterExpression;
    }

    return result;
  }

  private async isPrimaryKey(attrName: string): Promise<boolean>{
    if(!this.tableInfo){
      this.tableInfo = await this.loadTableInfo();
    }
    return this.tableInfo.KeySchema.some((schema) => schema.AttributeName === attrName);
  }

  /**
   * update AWS Config;
   */
  static updateConfig(config: ConfigurationOptions & ConfigurationServicePlaceholders & APIVersions & { [key: string]: any }) {
    this.awsConfig = config;
    AWS.config.update(config);
  }

  /**
   * clear cathing Memory;
   */
  static clear(): void {
    this.awsConfig = {};
    this.tableInfos = {};
  }
}
