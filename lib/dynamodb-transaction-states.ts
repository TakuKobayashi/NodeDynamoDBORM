import { TransactWriteItem } from 'aws-sdk/clients/dynamodb';

export interface TransactionStates {
  isInnerTransaction: boolean;
}

export interface TransactionWriterStates extends TransactionStates {
  writerItems: TransactWriteItem[];
}
