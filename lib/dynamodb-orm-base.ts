import { DynamoDBORMRelation } from './dynamodb-orm-relation';
import { DynamoDBClient, DescribeTableCommand, TableDescription, QueryCommandInput } from '@aws-sdk/client-dynamodb';
import { DynamoDBConnection } from './dynamodb-connection';

export abstract class DynamoDBORMBase {
  public tableName: string;
  public tableInfo: TableDescription;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  abstract where(filterObject: { [s: string]: any }): DynamoDBORMRelation;

  abstract offset(offsetStart: { [s: string]: any }): DynamoDBORMRelation;

  abstract count(): Promise<Number>;

  abstract exists(filterObject: { [s: string]: any }): Promise<boolean>;

  abstract limit(limitNumaber: number): Promise<{ [s: string]: any }[]>;

  protected async loadTableInfo() {
    const command = new DescribeTableCommand({ TableName: this.tableName });
    const tableInfo = await this.getAndaridateDynamoDBClient().send(command);
    this.tableInfo = tableInfo.Table;
    return tableInfo.Table;
  }

  protected async generateFilterQueryExpression(filterObject: { [s: string]: any }): Promise<Partial<QueryCommandInput>> {
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
    const result: Partial<QueryCommandInput> = {
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

  protected getAndaridateDynamoDBClient(): DynamoDBClient {
    const dynamodbClient = DynamoDBConnection.dynamodbClient;
    if (!dynamodbClient) {
      throw Error('Please set DynamoDBClientConfig to DynamoDBConnection.confingurations');
    }
    return dynamodbClient;
  }
}
