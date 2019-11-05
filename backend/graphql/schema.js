const {buildSchema} = require('graphql');

module.exports = buildSchema(`
"""
##################### Users #####################
"""
type User {
  _id: ID!
  fullname:String!
  image_URL:String!
  email: String!
  isVerified:Boolean!
  verificationCode:String
  isResettingPassword:Boolean
  passwordResetCode:String
  isActive:Boolean!
  isCustomer:Boolean!
  password:String
  signupTimestamp_UNIX:String!
  lastLoginTimestamp_UNIX:String
  signupMethod:String!
  balance_EUR:Float!
}
type BusinessUser {
  _id: ID!
  nr:Int!
  legalname: String!
  logoURL:String
  displayname: String!
  description: String!
  email: String!
  IBAN: String!
  password: String!
}
type AuthData {
  userFullName: String!
  userImage_URL:String!
  token: String!
  tokenExpiration:String!  
}
type BusinessAuthData {
  businessDisplayName: String!
  businessLegalName: String!
  logoURL:String!
  token: String!
  tokenExpiration:String!  
}

input UserInput {
  email: String!
  password: String
  signupMethod:String!
  image_URL:String
  fullname: String
}

input BusinessUserInput {
  legalname: String!
  logoURL:String
  displayname: String!
  description: String!
  email: String!
  IBAN: String!
  password: String!
}
"""
#####################Categories#####################
"""
type GeneralCategory {
  _id: ID!
  name: String!
  tax:Float!
}
"""
##################### Goods #####################
"""
type CartGood {
  _id: ID!
  price_per_one_item: Float!
  quantity: Int!
  good: Good!
  shoppingcart:ShoppingCart!
}
type OrderGood {
  _id: ID!
  title: String!
  dateCreated_UTC:String!
  price_per_one_item: Float!
  main_image_cloudinary_secure_url: String!
  quantity: Int!
  currency: String!
}
type Good {
  _id: ID!
  nr:Int!
  title:String!
  description:String!
  quantity: Int!
  booked: Int!
  current_price:Float!
  listing_price: Float!
  listing_timestamp: String!
  general_category: GeneralCategory!
  main_image_cloudinary_secure_url:String!
  other_images_cloudinary_secure_url: [String!]
  currency: String!
  keywords:[String!]!
  seller: BusinessUser!
  height_in:Float!
  length_in:Float!
  width_in:Float!
  weight_oz:Float!
  custom_attribute_names:[String!]
  custom_attribute_values:[String!]
}
input goodInput {
  title:String!
  description:String!
  quantity:Int!
  listing_price: Float!
  general_category_name: String!
  main_image_cloudinary_secure_url:String!
  other_images_cloudinary_secure_url:[String!]
  currency:String!
  seller_jwt_token:String!
  height_mm:Float!
  length_mm:Float!
  width_mm:Float!
  weight_g:Float!
  custom_attribute_1_name:String,
  custom_attribute_2_name:String,
  custom_attribute_3_name:String,
  custom_attribute_4_name:String,
  custom_attribute_5_name:String,
  custom_attribute_1_value:String,
  custom_attribute_2_value:String,
  custom_attribute_3_value:String,
  custom_attribute_4_value:String,
  custom_attribute_5_value:String,
}
"""
##################### ShoppingCart #####################
"""
type ShoppingCart {
  _id: ID!
  cart_identifier: String!
  goods: [CartGood!]
  success_id: String
  stripe_charged_total: Float
  shipping_cost:Float
  tax_cost:Float
  shippingAddress:OrderAddress
  deliveryEstimate_UTC:String
}

type ForexRate {
  _id: ID!
  source:String!
  target:String!
  rate:Float!
  lastUpdateTime_UTC:String!
}
"""
##################### Shipping #####################
"""
type StripeShipping {
    _id:ID!
    good:Good!
    StripeParentCode:String!
    StripeSKUCode:String!
 }

type ParcelDeliveryLocation{
    _id:ID!
    provider:String!
    name:String!
    country:String!
    x_coordinate:Float!
    y_coordinate:Float!
}

"""
##################### Estimate #####################
"""
input deliveryEstimate {
  good_id:ID!
  quantity:Int!
  timezoneOffset_M:Int!
  lat:Float!,
  long:Float!
}

input orderDeliveryEstimate {
  jwt_token:String!
  timezoneOffset_M:Int!,
  shippingCountry:String!,
  shippingMethod:String!
}

type DeliveryEstimate {
    deliveryTime: String!,
    issueDate: String!
}

"""
##################### Warehouse #####################
"""

type MonthAndRevenue {
  Jan: Float
  Feb: Float
  Mar: Float
  Apr: Float
  May: Float
  June: Float
  July: Float
  Aug: Float
  Sep: Float
  Okt: Float
  Nov: Float
  Dec: Float
}
type MonthAndCount {
  Jan: Int
  Feb: Int
  Mar: Int
  Apr: Int
  May: Int
  June: Int
  July: Int
  Aug: Int
  Sep: Int
  Okt: Int
  Nov: Int
  Dec: Int
}


"""
##################### Orders #####################
"""
type Order {
  _id: ID!
  received_timestamp_UTC:String!
  processing_start_timestamp_UTC:String
  processing_end_timestamp_UTC:String
  shipped_timestamp_UTC:String
  status: String!
  customer: User!
  fulfillers:[BusinessUser!]!
  partial_orders: [PartialOrder!]!
  subtotal: Float!
  shipping_cost:Float!
  tax_cost:Float!
  order_items: [OrderGood!]!
  deliveryEstimate_UTC:String!
  shippingAddress:OrderAddress!

}
type PartialOrder {
    _id: ID!
    received_timestamp_UTC:String
    processing_start_timestamp_UTC:String
    processing_end_timestamp_UTC:String
    shipped_timestamp_UTC:String
    partial_subtotal: Float!
    partial_shipping_cost:Float!
    partial_tax_cost:Float!
    partial_order_status:String!
    fulfiller: BusinessUser!
    order_items:[OrderGood!]!
}
   
type StripeCheckout {
  sessionId: String
}
input finalOrderInput {
  jwt_token:String!
  success_id:String!
}

       
input OrderInput {
  jwt_token: String!
   ParcelDeliveryLocation:ID,
   TimezoneOffset_M:Int!
   ShippingName:String,
   ShippingAddressLine1:String,
   ShippingAddressLine2:String,
   ShippingCity:String,
   ShippingRegion:String,
   ShippingZip:String,
   ShippingCountry:String,
   ShippingMethod:String!,
   ShippingCost:Float,
   taxCost:Float,
   ShippingCurrency:String!,
   deliveryEstimate_UTC:String,
   totalCost:Float
}

type EnhancedPartialOrder {
    _id: ID!
    partialOrder:PartialOrder!
    shippingAddress:OrderAddress!
}

"""
##################### Address #####################
"""
type OrderAddress {
  _id: ID!
  dateAdded_UTC:String!
  isActive:Boolean!
  isDefault:Boolean!
  shippingName:String!
  addressOne:String
  addressTwo:String
  city:String
  region:String
  zip:String
  country:String
  shippingMethod:String!
  parcelDeliveryLocation:ParcelDeliveryLocation
}
"""
##################### Search #####################
"""
type Refinement {
  numericRefinements:[String!],
  nonNumericRefinements:[String!],
}

"""
##################### Root Query #####################
"""
type RootQuery {
    search(query: String!):Refinement
    trending:[Good!]
    recommend(jwt_token:String,nr:Int!):[Good!]
    bestselling(nr:Int!):[Good!]
   
    businessLogin(email: String!, password: String!): BusinessAuthData!
    login(email: String!, password: String!,old_cart_id:String,image_URL:String,loginMethod:String!,fullname:String): AuthData!    
 
    individualUser(jwt_token: String!): User!
    individualBusinessUser(nr:Int!,displayname:String): BusinessUser!
    individualOrder(jwt_token: String!,order_id:String): [Order!]
    individualGood(nr:Int!,jwt_token:String):Good!
    
    individualPartialOrder(partial_order_id:String!):PartialOrder!
    partialOrdersNotYetShipped(jwt_token:String!):[EnhancedPartialOrder!]
    productsInWarehouse(jwt_token:String!):[Good!]
    thisMonthsRevenue(jwt_token:String!):Float!
    thisYearsRevenue(jwt_token:String!):Float!
    thisMonthsExpenses(jwt_token:String!):Float!
    thisYearsExpenses(jwt_token:String!):Float!
    
    nrOfOrdersProcessingNotStarted(jwt_token:String!):Int!
    nrOfInProgressOrders(jwt_token:String!):Int!
    nrOfNotShippedOrders(jwt_token:String!):Int!
    unCompletedOrdersValue(jwt_token:String!):Float!
    
    businessUserGoods(nr:Int!,displayname:String): [Good!]
    allGeneralCategories:[GeneralCategory!]!
    individualCart(jwt_token: String!): ShoppingCart
    ParcelDeliveryLocations(UserLatCoordinate: Float!,UserLonCoordinate: Float!):[ParcelDeliveryLocation!]
    numberOfGoodsInCartAndSubtotalAndTax(jwt_token: String!):[Float!]!
    
    orderGoods(orderInput: finalOrderInput!):Order!
    DeliveryCost(deliverycostInput:OrderInput):Float!
    
    
    receiveContactFormMessage(clientName:String!, clientEmail:String!, subject:String!, clientMessage:String!):Boolean!
    
    singleProductDeliveryEstimate(deliveryEstimate:deliveryEstimate):[DeliveryEstimate!]!
    orderDeliveryEstimate(deliveryEstimate:orderDeliveryEstimate):DeliveryEstimate!
}
"""
##################### Root Mutation #####################
"""
type RootMutation {
    createBusinessUser(userInput: BusinessUserInput): String!
    createUser(userInput: UserInput): String!
    verifyEmail(token:String):AuthData!
    resetPassword(email:String,password:String,mode:String!,token:String):Boolean!
    makeAddressDefault(jwt_token:String!,location_id:ID!):Boolean!
    makeAddressNotActive(jwt_token:String!,location_id:ID!):Boolean!
    
    
    addParcelDeliveryLocation(provider:String!,name:String!,country:String!,x_coordinate:Float!,y_coordinate:Float!):ParcelDeliveryLocation!
    createGeneralCategory(name: String!,tax:Float!):GeneralCategory!
    
    addPhysicalGood(goodInput: goodInput): Good!
    addToCart(cart_identifier: String!,good_id: ID!,quantity:Int!): ShoppingCart!
    showCheckout(checkoutInput:OrderInput):StripeCheckout!
    updatePartialOrderStatus(jwt_token:String!, partialOrderId:ID!,newStatus:String!):PartialOrder!
}

schema {
    query: RootQuery
    mutation: RootMutation
}
`)
;