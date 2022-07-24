import { AttributeValue } from '@aws-sdk/client-dynamodb';

export function convertObjectToRecordStringValue(inputObject: { [s: string]: any }): Record<string, AttributeValue> {
  const convertedRecord: Record<string, AttributeValue> = {};
  const keys = Object.keys(inputObject);
  for (const key of keys) {
    convertedRecord[key] = convertAnyToAttributeValue(inputObject[key]);
  }
  return convertedRecord;
}

function convertAnyToAttributeValue(inputValue: any): AttributeValue {
  const typeofValue = typeof inputValue;
  if (typeofValue === 'number') {
    return { N: inputValue };
  } else if (typeofValue === 'string') {
    return { S: inputValue };
  } else if (typeofValue === 'boolean') {
    return { BOOL: inputValue };
  } else if (inputValue === null) {
    return { NULL: true };
  } else if (inputValue instanceof Uint8Array) {
    return { B: inputValue };
  } else if (inputValue instanceof ArrayBuffer) {
    return { B: new Uint8Array(inputValue) };
  } else if (Array.isArray(inputValue)) {
    const attributeValues: AttributeValue[] = [];
    for (const inputValueCell of inputValue) {
      attributeValues.push(convertAnyToAttributeValue(inputValueCell));
    }
    return { L: attributeValues };
  } else if (typeofValue === 'object') {
    return { M: convertObjectToRecordStringValue(inputValue) };
  }
}

export function convertRecordStringValueToValue(inputRecordValue: Record<string, AttributeValue>): { [s: string]: any } {
  const covertedRecord: { [s: string]: any } = {};
  const keys = Object.keys(inputRecordValue);
  for (const key of keys) {
    covertedRecord[key] = convertAttributeValueToAny(inputRecordValue[key]);
  }
  return covertedRecord;
}

function convertAttributeValueToAny(attributeValue: AttributeValue): any {
  if (attributeValue.L) {
    const attributeValues: AttributeValue[] = [];
    for (const valueList of attributeValue.L) {
      attributeValues.push(convertAttributeValueToAny(valueList));
    }
    return attributeValues;
  } else if (attributeValue.M) {
    return convertRecordStringValueToValue(attributeValue.M);
  }
  const keys = Object.keys(attributeValue);
  for (const key of keys) {
    if (attributeValue[key]) {
      return attributeValue[key];
    }
  }
}
