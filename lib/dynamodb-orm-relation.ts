import DynamoDBORMBase from './dynamodb-orm-base';
import { QueryInput } from 'aws-sdk/clients/dynamodb';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import ScanOutput = DocumentClient.ScanOutput;
import QueryOutput = DocumentClient.QueryOutput;

export default class DynamoDBORMRelation extends DynamoDBORMBase {
  private filterObject: { [s: string]: any };
  private queryParams: QueryInput;

  constructor(tableName: string) {
    super(tableName);
    this.filterObject = {};
    this.queryParams = {
      TableName: this.tableName,
    };
  }

  /**
   * get all tables data.
   * @param {string} tablename.
   * @return {array[object]} all of table data.
   */
  where(filterObject: { [s: string]: any }): DynamoDBORMRelation {
    this.filterObject = { ...this.filterObject, ...filterObject };
    return this;
  }

  /**
   * get all tables data.
   * @return {array[object]} all of table data.
   */
  offset(offsetStart: { [s: string]: any }): DynamoDBORMRelation {
    this.queryParams.ExclusiveStartKey = offsetStart;
    return this;
  }

  async load(): Promise<Map<string, any>[]> {
    const queryResult = await this.executeQuery();
    return queryResult.Items as Map<string, any>[];
  }

  /**
   * get all tables data.
   * @return {array[object]} all of table data.
   */
  async count(): Promise<Number> {
    this.queryParams.Select = 'COUNT';
    const queryResult = await this.executeQuery();
    return queryResult.Count;
  }

  /**
   * get all tables data.
   * @return {boolean} all of table data.
   */
  async exists(filterObject: { [s: string]: any } = {}): Promise<boolean> {
    this.filterObject = { ...this.filterObject, ...filterObject };
    this.queryParams.Limit = 1;
    const countNumber = await this.count();
    return countNumber > 0;
  }

  /**
   * get all tables data.
   * @return {array[object]} all of table data.
   */
  async limit(limitNumaber: number): Promise<Map<string, any>[]> {
    this.queryParams.Limit = limitNumaber;
    const queryResult = await this.executeQuery();
    return queryResult.Items as Map<string, any>[];
  }

  private async executeQuery(): Promise<QueryOutput | ScanOutput> {
    if (this.filterObject && Object.keys(this.filterObject).length > 0) {
      const filterQueryExpressions = await this.generateFilterQueryExpression(this.filterObject);
      return this.dynamoClient.query({ ...this.queryParams, ...filterQueryExpressions }).promise();
    } else {
      return this.dynamoClient.scan(this.queryParams).promise();
    }
  }
}
