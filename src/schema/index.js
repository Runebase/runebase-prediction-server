const { makeExecutableSchema } = require('graphql-tools');
const resolvers = require('./resolvers');

// Define your types here.
const typeDefs = `

type NewOrder {
  txid: String!
  txCanceled: String!
  txFulfilled: String!
  timeCanceled: String!
  timeFulfilled: String!
  orderId: String!
  token: String!
  tokenName: String!
  orderType: String!
  type: String!
  price: String!
  status: _OrderStatusType!
  owner: String!
  sellToken: String!
  buyToken: String!
  priceMul: String!
  priceDiv: String!
  time: String!
  amount: String!
  startAmount: String!
  blockNum: Int
}

type Market {
  market: String!
  tokenName: String!
  price: String!
  change: String!
  volume: String!
  orderCount: String!
}

type FundRedeem {
  txid: String!
  type: String!
  token: String!
  tokenName: String!
  status: String!
  owner: String!
  time: Int!
  date: String!
  amount: String!
  blockNum: Int
}

type Trade {
  status: String!
  txid: String!
  date: String!
  from: String!
  to: String!
  soldTokens: String!
  boughtTokens: String!
  tokenName: String!
  orderType: String!
  price: String!
  orderId: String!
  time: Int
  amount: String!
  blockNum: Int
}

type Topic {
  txid: String!
  version: Int!
  blockNum: Int
  status: _OracleStatusType!
  address: String
  escrowAmount: String
  name: String!
  options: [String!]!
  resultIdx: Int
  runebaseAmount: [String!]!
  predAmount: [String!]!
  oracles: [Oracle]
  transactions: [Transaction]
  creatorAddress: String!
}

type Oracle {
  txid: String!
  version: Int!
  blockNum: Int
  status: _OracleStatusType!
  address: String
  topicAddress: String
  resultSetterAddress: String
  resultSetterQAddress: String
  token: String!
  name: String!
  options: [String!]!
  optionIdxs: [Int!]!
  amounts: [String!]!
  resultIdx: Int
  startTime: String!
  endTime: String!
  resultSetStartTime: String
  resultSetEndTime: String
  consensusThreshold: String
  transactions: [Transaction]
}

type Vote {
  txid: String!
  version: Int!
  blockNum: Int!
  voterAddress: String!
  voterQAddress: String!
  topicAddress: String!
  oracleAddress: String!
  optionIdx: Int!
  token: _TokenType!
  amount: String!
}

type Transaction {
  type: _TransactionType!
  status: _TransactionStatus!
  txid: String
  createdTime: String!
  blockNum: Int
  blockTime: String
  gasLimit: String!
  gasPrice: String!
  gasUsed: Int
  version: Int!
  senderAddress: String!
  receiverAddress: String
  topicAddress: String
  oracleAddress: String
  name: String
  options: [String!]
  resultSetterAddress: String
  bettingStartTime: String
  bettingEndTime: String
  resultSettingStartTime: String
  resultSettingEndTime: String
  optionIdx: Int
  token: _TokenType
  amount: String
  topic: Topic
}

type Block {
  blockNum: Int!
  blockTime: String!
}

type syncInfo {
  syncBlockNum: Int
  syncBlockTime: String
  syncPercent: Int
  peerNodeCount: Int
  addressBalances: [AddressBalance]
}

type fundRedeemInfo {
  fundRedeemInfo: [FundRedeem]
}

type myOrderInfo {
  myOrderInfo: [NewOrder]
}

type activeOrderInfo {
  activeOrderInfo: [NewOrder]
}

type fulfilledOrderInfo {
  fulfilledOrderInfo: [NewOrder]
}

type canceledOrderInfo {
  canceledOrderInfo: [NewOrder]
}

type buyOrderInfo {
  buyOrderInfo: [NewOrder]
}

type sellOrderInfo {
  sellOrderInfo: [NewOrder]
}

type myTradeInfo {
  myTradeInfo: [Trade]
}

type buyHistoryInfo {
  buyHistoryInfo: [Trade]
}

type sellHistoryInfo {
  sellHistoryInfo: [Trade]
}

type selectedOrderInfo {
  selectedOrderInfo: [NewOrder]
}

type marketInfo {
  marketInfo: [Market]
}

type Query {
  allFundRedeems(filter: FundRedeemFilter, orderBy: [Order!], limit: Int, skip: Int): [FundRedeem]!
  allMarkets(filter: MarketFilter, orderBy: [Order!], limit: Int, skip: Int): [Market]!
  allTrades(filter: TradeFilter, orderBy: [Order!], limit: Int, skip: Int): [Trade]!
  allNewOrders(filter: NewOrderFilter, orderBy: [Order!], limit: Int, skip: Int): [NewOrder]!
  allTopics(filter: TopicFilter, orderBy: [Order!], limit: Int, skip: Int): [Topic]!
  allOracles(filter: OracleFilter, orderBy: [Order!], limit: Int, skip: Int ): [Oracle]!
  searchOracles(searchPhrase: String, orderBy: [Order!], limit: Int, skip: Int): [Oracle]!
  allVotes(filter: VoteFilter, orderBy: [Order!], limit: Int, skip: Int): [Vote]!
  allTransactions(filter: TransactionFilter, orderBy: [Order!], limit: Int, skip: Int): [Transaction]!
  syncInfo(includeBalance: Boolean): syncInfo!
  fundRedeemInfo: fundRedeemInfo!
  myOrderInfo: myOrderInfo!
  activeOrderInfo: activeOrderInfo!
  fulfilledOrderInfo: fulfilledOrderInfo!
  canceledOrderInfo: canceledOrderInfo!
  sellOrderInfo: sellOrderInfo!
  myTradeInfo: myTradeInfo!
  buyHistoryInfo: buyHistoryInfo!
  sellHistoryInfo: sellHistoryInfo!
  buyOrderInfo: buyOrderInfo!
  selectedOrderInfo: selectedOrderInfo!
  marketInfo: marketInfo!
}

input FundRedeemFilter {
  OR: [FundRedeemFilter!]
  txid: String
  type: String
  token: String
  tokenName: String
  status: String
  owner: String
  time: Int
  date: String
  amount: String
  blockNum: Int
}

input TradeFilter {
  OR: [TradeFilter!]
  status: String
  txid: String
  from: String
  to: String
  soldTokens: String
  boughtTokens: String
  tokenName: String
  orderType: String
  price: String
  orderId: String
  time: Int
  amount: String
  blockNum: Int
}

input NewOrderFilter {
  OR: [NewOrderFilter!]
  txid: String
  token: String
  tokenName: String
  orderType: String
  type: String
  status: _OrderStatusType
  price: String
  orderId: String
  owner: String
  sellToken: String
  buyToken: String
  priceMul: String
  priceDiv: String
  time: String
  amount: String
  blockNum: Int
}

input MarketFilter {
  OR: [MarketFilter!]
  market: String
  tokenName: String
  price: String
  change: String
  volume: String
}

input TopicFilter {
  OR: [TopicFilter!]
  txid: String
  address: String
  status: _OracleStatusType
  resultIdx: Int
  creatorAddress: String
}

input OracleFilter {
  OR: [OracleFilter!]
  txid: String
  address: String
  topicAddress: String
  resultSetterQAddress: String
  status: _OracleStatusType
  token: _TokenType
  excludeResultSetterQAddress: [String]
}

input VoteFilter {
  OR: [VoteFilter!]
  address: String
  topicAddress: String
  oracleAddress: String
  voterAddress: String
  voterQAddress: String
  optionIdx: Int
}

input TransactionFilter {
  OR: [TransactionFilter!]
  type: _TransactionType
  status: _TransactionStatus
  topicAddress: String
  oracleAddress: String
  senderAddress: String
  senderQAddress: String
}

type Mutation {
  createTopic(
    senderAddress: String!
    name: String!
    options: [String!]!
    resultSetterAddress: String!
    bettingStartTime: String!
    bettingEndTime: String!
    resultSettingStartTime: String!
    resultSettingEndTime: String!
    amount: String!
  ): Transaction

  createBet(
    version: Int!
    senderAddress: String!
    topicAddress: String!
    oracleAddress: String!
    optionIdx: Int!
    amount: String!
  ): Transaction

  setResult(
    version: Int!
    senderAddress: String!
    topicAddress: String!
    oracleAddress: String!
    amount: String!
    optionIdx: Int!
  ): Transaction

  createVote(
    version: Int!
    senderAddress: String!
    topicAddress: String!
    oracleAddress: String!
    optionIdx: Int!
    amount: String!
  ): Transaction

  finalizeResult(
    version: Int!
    senderAddress: String!
    topicAddress: String!
    oracleAddress: String!
  ): Transaction

  withdraw(
    type: _TransactionType!
    version: Int!
    senderAddress: String!
    topicAddress: String!
  ): Transaction

  transfer(
    senderAddress: String!
    receiverAddress: String!
    token: _TokenType!
    amount: String!
  ): Transaction

  transferExchange(
    senderAddress: String!
    receiverAddress: String!
    token: _TokenType!
    amount: String!
  ): Transaction

  redeemExchange(
    senderAddress: String!
    receiverAddress: String!
    token: _TokenType!
    amount: String!
  ): Transaction

  orderExchange(
    senderAddress: String!
    receiverAddress: String!
    token: _TokenType!
    amount: String!
    price: String!
    orderType: String!
  ): Transaction

  cancelOrderExchange(
    senderAddress: String!
    orderId: String!
  ): Transaction

  executeOrderExchange(
    senderAddress: String!
    orderId: String!
    exchangeAmount: String!
  ): Transaction

}

type Subscription {
  onSyncInfo : syncInfo
  onFundRedeemInfo : fundRedeemInfo
  onMyOrderInfo : myOrderInfo
  onCanceledOrderInfo : canceledOrderInfo
  onActiveOrderInfo : activeOrderInfo
  onFulfilledOrderInfo : fulfilledOrderInfo
  onMyTradeInfo : myTradeInfo
  onBuyHistoryInfo : buyHistoryInfo
  onSellHistoryInfo : sellHistoryInfo
  onSellOrderInfo : sellOrderInfo
  onSelectedOrderInfo : selectedOrderInfo
  onBuyOrderInfo : buyOrderInfo
  onMarketInfo : marketInfo
}

input topicSubscriptionFilter {
  mutation_in: [_ModelMutationType!]
}

input Order {
  field: String!
  direction: _OrderDirection!
}

type TopicSubscriptionPayload {
  mutation: _ModelMutationType!
  node: Topic
}

type AddressBalance {
  address: String!,
  runebase: String!,
  pred: String!,
  fun: String!,
  exchangerunes: String!,
  exchangepred: String!,
  exchangefun: String!,
}

enum _ModelMutationType {
  CREATED
  UPDATED
  DELETED
}

enum _OracleStatusType {
  CREATED
  VOTING
  WAITRESULT
  OPENRESULTSET
  PENDING
  WITHDRAW
}

enum _OrderStatusType {
  FULFILLED
  ACTIVE
  CANCELED
  PENDING
  PENDINGCANCEL
}

enum _TokenType {
  RUNES
  PRED
  FUN
}

enum _OrderDirection {
  DESC
  ASC
}

enum _TransactionType {
  APPROVECREATEEVENT
  CREATEEVENT
  BET
  APPROVESETRESULT
  SETRESULT
  APPROVEVOTE
  VOTE
  RESETAPPROVE
  FINALIZERESULT
  WITHDRAW
  WITHDRAWESCROW
  TRANSFER
  FUNDEXCHANGE
  REDEEMEXCHANGE
  BUYORDER
  SELLORDER
  CANCELORDER
  EXECUTEORDER
}

enum _TransactionStatus {
   PENDING
   FAIL
   SUCCESS
   PENDINGCANCEL
}
`;

// Generate the schema object from your types definition.
module.exports = makeExecutableSchema({ typeDefs, resolvers });
