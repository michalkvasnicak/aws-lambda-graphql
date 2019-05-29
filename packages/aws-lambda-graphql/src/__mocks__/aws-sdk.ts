import { DynamoDB as BaseDynamoDB } from 'aws-sdk';

const postToConnectionPromiseMock = jest.fn();
const postToConnectionMock = jest.fn(() => ({
  promise: postToConnectionPromiseMock,
}));

class ApiGatewayManagementApi {
  postToConnection = postToConnectionMock;
}

const batchWritePromiseMock = jest.fn();
const batchWriteMock = jest.fn(() => ({ promise: batchWritePromiseMock }));
const deletePromiseMock = jest.fn();
const deleteMock = jest.fn(() => ({ promise: deletePromiseMock }));
const getPromiseMock = jest.fn();
const getMock = jest.fn(() => ({ promise: getPromiseMock }));
const putPromiseMock = jest.fn();
const putMock = jest.fn(() => ({ promise: putPromiseMock }));
const queryPromiseMock = jest.fn();
const queryMock = jest.fn(() => ({ promise: queryPromiseMock }));

class DocumentClient {
  batchWrite = batchWriteMock;

  delete = deleteMock;

  get = getMock;

  put = putMock;

  query = queryMock;
}

const DynamoDB = { DocumentClient, Converter: BaseDynamoDB.Converter };

export {
  ApiGatewayManagementApi,
  batchWriteMock,
  batchWritePromiseMock,
  DynamoDB,
  getMock,
  getPromiseMock,
  deleteMock,
  deletePromiseMock,
  postToConnectionMock,
  postToConnectionPromiseMock,
  putMock,
  putPromiseMock,
  queryMock,
  queryPromiseMock,
};
