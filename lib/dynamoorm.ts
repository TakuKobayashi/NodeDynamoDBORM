import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders';
import { APIVersions, ConfigurationOptions } from 'aws-sdk/lib/config';

const AWS = require('aws-sdk');
let dynamoClient = new AWS.DynamoDB.DocumentClient();

export class DynamoORM {
  constructor() {
    dynamoClient = new AWS.DynamoDB.DocumentClient();
  }

  static updateConfig(config: ConfigurationOptions & ConfigurationServicePlaceholders & APIVersions & {[key: string]: any}, allowUnknownKeys: true) {
    AWS.config.update(config);
    dynamoClient = new AWS.DynamoDB.DocumentClient();
  }

  async findBy(tablename: string, filterObject: { [s: string]: any }): Promise<Map<string, any>> {
    const params = {
      TableName: tablename,
      Key: filterObject,
    };
    const result = await dynamoClient.get(params).promise();
    return result.Item as Map<string, any>;
  }

  async findByAll(tablename: string, filterObject: { [s: string]: any }): Promise<Map<string, any>[]> {
    const keyNames = Object.keys(filterObject);
    const keyConditionExpression = keyNames.map((keyName) => '#' + keyName + ' = ' + ':' + keyName).join(' AND ');
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    for (const keyName of keyNames) {
      expressionAttributeNames['#' + keyName] = keyName;
      expressionAttributeValues[':' + keyName] = filterObject[keyName];
    }
    const params = {
      TableName: tablename,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    };
    const queryResult = await dynamoClient.query(params).promise();
    return queryResult.Items as Map<string, any>[];
  }

  async update(tablename: string, filterObject: { [s: string]: any }, updateObject: { [s: string]: any }): Promise<Map<string, any>>{
    let updateExpressionString = 'set ';
    const updateExpressionAttributeValues = {};
    const keys = Object.keys(updateObject);
    for (let i = 0; i < keys.length; ++i) {
      const praceholder = ':Attr' + i.toString();
      updateExpressionString = updateExpressionString + keys[i] + ' = ' + praceholder;
      if (i !== keys.length - 1) {
        updateExpressionString = updateExpressionString + ', ';
      }
      updateExpressionAttributeValues[praceholder] = updateObject[keys[i]];
    }
    const params = {
      TableName: tablename,
      Key: filterObject,
      UpdateExpression: updateExpressionString,
      ExpressionAttributeValues: updateExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };
    const updateResult = await dynamoClient.update(params).promise();
    return updateResult.Attributes as Map<string, any>;
  }

  async create(tablename: string, putObject: { [s: string]: any }): Promise<Map<string, any>> {
    const params = {
      TableName: tablename,
      Item: putObject,
      ReturnValues: "ALL_OLD",
    };
    const createResult = await dynamoClient.put(params).promise();
    return Object.assign(createResult.Attributes, putObject) as Map<string, any>;
  }

  async delete(tablename: string, filterObject: { [s: string]: any }): Promise<Map<string, any>> {
    const params = {
      TableName: tablename,
      Key: filterObject,
      ReturnValues: "ALL_OLD",
    };
    const deleteResult = await dynamoClient.delete(params).promise();
    return deleteResult.Attributes as Map<string, any>;
  }

  async all(tablename): Promise<Map<string, any>[]> {
    const scanResult = await dynamoClient.scan({ TableName: tablename }).promise();
    return scanResult.Items as Map<string, any>[];
  }

  where(tablename, filterObjects): DynamoORMRelation {
    const relation = new DynamoORMRelation();
    return relation.where(tablename, filterObjects);
  }
}

class DynamoORMRelation {
  private batchTableFilter: { [s: string]: any } = {};

  constructor() {
    dynamoClient = new AWS.DynamoDB.DocumentClient();
    this.clear();
  }

  where(tablename, filterObjects): DynamoORMRelation {
    if (!this.batchTableFilter[tablename]) {
      this.batchTableFilter[tablename] = {};
    }
    const filterObjectKeys = Object.keys(filterObjects);
    for (const filterObjectKey of filterObjectKeys) {
      if (!this.batchTableFilter[tablename][filterObjectKey]) {
        this.batchTableFilter[tablename][filterObjectKey] = [];
      }
      const values = [].concat.apply([], [filterObjects[filterObjectKey]]);
      const filterValues = this.batchTableFilter[tablename][filterObjectKey].concat(values);
      this.batchTableFilter[tablename][filterObjectKey] = filterValues.filter((elem, index, self) => self.indexOf(elem) == index);
    }
    return this;
  }

  async load() {
    const requestItems = {};
    for (const tableName of Object.keys(this.batchTableFilter)) {
      const keyValuesObject = this.batchTableFilter[tableName];
      const dynamoFilterKeys = [];
      const filterObjectKeys = Object.keys(keyValuesObject);
      for (const filterObjectKey of filterObjectKeys) {
        const dynamoFilterObject = {};
        for (const filterObjectValue of keyValuesObject[filterObjectKey]) {
          dynamoFilterObject[filterObjectKey] = filterObjectValue;
          dynamoFilterKeys.push(dynamoFilterObject);
        }
      }
      requestItems[tableName] = {
        Keys: dynamoFilterKeys,
      };
    }
    const params = {
      RequestItems: requestItems,
    };
    this.clear();
    return dynamoClient.batchGet(params).promise();
  }

  clear() {
    this.batchTableFilter = {};
  }
}
