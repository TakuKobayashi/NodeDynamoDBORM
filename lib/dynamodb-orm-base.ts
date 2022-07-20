import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders';
import { APIVersions, ConfigurationOptions } from 'aws-sdk/lib/config';
import { DocumentClient, TableDescription } from 'aws-sdk/clients/dynamodb';
import { DynamoDBORMRelation } from './dynamodb-orm-relation';
import QueryInput = DocumentClient.QueryInput;

const AWS = require('aws-sdk');

export abstract class DynamoDBORMBase {
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

    if (!DynamoDBORMBase.tableInfos) {
      DynamoDBORMBase.tableInfos = {};
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

  abstract async count(): Promise<number>;

  abstract async exists(filterObject: { [s: string]: any }): Promise<boolean>;

  abstract async limit(limitNumaber: number): Promise<{ [s: string]: any }[]>;

  async findEach(callback: (record: { [s: string]: any }) => void, start: { [s: string]: any } = {}, batchSize: number = 1000): Promise<void>{
    console.warn(["startFindEach", batchSize, this.tableName].join(":"));
    this.findInBatches((records) => {
      for(const recordObject of records){
        callback(recordObject);
      }
    }, start, batchSize);
  }

  async findInBatches(callback: (records: { [s: string]: any }[]) => void, start:{ [s: string]: any } = {}, batchSize: number = 1000): Promise<void>{
    let offsetObject: { [s: string]: any } = {...start};
    let counter = 0;
    do{
      let recordObjects: { [s: string]: any }[] = [];
      if(offsetObject && Object.keys(offsetObject).length > 0){
        recordObjects = await this.offset(offsetObject).limit(batchSize)
      }else{
        recordObjects = await this.limit(batchSize)
      }
      console.warn(["recordCount", recordObjects.length].join(":"));
      console.warn(JSON.stringify(recordObjects));
      offsetObject = recordObjects[recordObjects.length - 1];
      counter = counter + recordObjects.length;
      callback(recordObjects);
    } while(offsetObject && Object.keys(offsetObject).length > 0);
    console.log(counter);
  }

  protected async loadTableInfo() {
    const dynamoDB = new AWS.DynamoDB();
    const tableInfo = await dynamoDB.describeTable({ TableName: this.tableName }).promise();
    this.tableInfo = tableInfo.Table;
    return tableInfo.Table;
  }

  protected async generateFilterQueryExpression(filterObject: { [s: string]: any }): Promise<Partial<QueryInput>> {
    const attrNames = Object.keys(filterObject);
    const keyConditionExpressionFactors = [];
    const filterExpressionFactors = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    for (const attrName of attrNames) {
      const placeHolderAttrName = ['#', attrName].join('');
      expressionAttributeNames[placeHolderAttrName] = attrName;
      if (Array.isArray(filterObject[attrName])) {
        const values = filterObject[attrName] as any[];
        const placeHolderAttrValues = [];
        for (let i = 0; i < values.length; ++i) {
          const placeHolderName = [':', attrName, i.toString()].join('');
          expressionAttributeValues[placeHolderName] = values[i];
          placeHolderAttrValues.push(placeHolderName);
        }
        const placeHolderAttrValue = ['IN(', placeHolderAttrValues.join(','), ')'].join('');
        if (await this.isPrimaryKey(attrName)) {
          keyConditionExpressionFactors.push([placeHolderAttrName, placeHolderAttrValue].join(' '));
        } else {
          filterExpressionFactors.push([placeHolderAttrName, placeHolderAttrValue].join(' '));
        }
      } else {
        const placeHolderAttrValue = [':', attrName].join('');
        expressionAttributeValues[placeHolderAttrValue] = filterObject[attrName];
        if (await this.isPrimaryKey(attrName)) {
          keyConditionExpressionFactors.push([placeHolderAttrName, placeHolderAttrValue].join(' = '));
        } else {
          filterExpressionFactors.push([placeHolderAttrName, placeHolderAttrValue].join(' = '));
        }
      }
    }

    const keyConditionExpression = keyConditionExpressionFactors.join(' AND ');
    const filterExpression = filterExpressionFactors.join(' AND ');
    const result: Partial<QueryInput> = {
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    };
    if (filterExpression.length > 0) {
      result.FilterExpression = filterExpression;
    }

    return result;
  }

  private async isPrimaryKey(attrName: string): Promise<boolean> {
    if (!this.tableInfo) {
      this.tableInfo = await this.loadTableInfo();
    }
    return this.tableInfo.KeySchema.some((schema) => schema.AttributeName === attrName);
  }

  /**
   * update AWS Config;
   */
  static updateConfig(config: ConfigurationOptions & ConfigurationServicePlaceholders & APIVersions & { [key: string]: any }) {
    const updateConfig = config;
    if (config.endpoint && config.endpoint instanceof String) {
      updateConfig.endpoint = new AWS.Endpoint(config.endpoint);
    }
    DynamoDBORMBase.awsConfig = updateConfig;
    AWS.config.update(updateConfig);
  }

  /**
   * clear table caching Memory;
   */
  static clearTableCache(): void {
    DynamoDBORMBase.tableInfos = {};
  }

  /**
   * clear aws config in Memory;
   */
  static clearConfig(): void {
    DynamoDBORMBase.awsConfig = {};
  }
}
