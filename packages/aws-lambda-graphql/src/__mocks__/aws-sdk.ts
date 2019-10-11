import { DynamoDB as BaseDynamoDB } from 'aws-sdk';

const postToConnectionPromiseMock = jest.fn();
const postToConnectionMock = jest.fn(() => ({
  promise: postToConnectionPromiseMock,
}));
const deleteConnectionPromiseMock = jest.fn();
const deleteConnectionMock = jest.fn(() => ({
  promise: deleteConnectionPromiseMock,
}));

class ApiGatewayManagementApi {
  postToConnection = postToConnectionMock;

  deleteConnection = deleteConnectionMock;
}

const batchWritePromiseMock = jest.fn();
const batchWriteMock = jest.fn(() => ({ promise: batchWritePromiseMock }));
const deletePromiseMock = jest.fn();
const deleteMock = jest.fn(() => ({ promise: deletePromiseMock }));
const getPromiseMock = jest.fn();
const getMock = jest.fn(() => ({ promise: getPromiseMock }));
const putPromiseMock = jest.fn();
const putMock = jest.fn(() => ({ promise: putPromiseMock }));
const updatePromiseMock = jest.fn();
const updateMock = jest.fn(() => ({ promise: updatePromiseMock }));
const queryPromiseMock = jest.fn();
const queryMock = jest.fn(() => ({ promise: queryPromiseMock }));
const transactWritePromiseMock = jest.fn();
const transactWriteMock = jest.fn(() => ({
  promise: transactWritePromiseMock,
}));

class DocumentClient {
  batchWrite = batchWriteMock;

  delete = deleteMock;

  get = getMock;

  put = putMock;

  update = updateMock;

  query = queryMock;

  transactWrite = transactWriteMock;
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
  deleteConnectionMock,
  deleteConnectionPromiseMock,
  putMock,
  putPromiseMock,
  updateMock,
  updatePromiseMock,
  queryMock,
  queryPromiseMock,
  transactWriteMock,
  transactWritePromiseMock,
};
