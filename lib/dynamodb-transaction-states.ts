import { TransactWriteItem } from '@aws-sdk/client-dynamodb';

export interface TransactionStates {
  isInnerTransaction: boolean;
}

export interface TransactionWriterStates extends TransactionStates {
  writerItems: TransactWriteItem[];
}
