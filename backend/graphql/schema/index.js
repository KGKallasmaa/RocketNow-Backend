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
  businessname: String!
  email: String!
  password: String!
}
type AuthData {
  userFullName: String!
  userImage_URL:String!
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
  businessname: String!
  email: String!
  password: String!
}
"""
#####################Categories#####################
"""
type GeneralCategory {
  _id: ID!
  name: String!
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
  current_price:Float!
  listing_price: Float!
  listing_timestamp:String!
  general_category_name: String!
  main_image_cloudinary_public_id:String!
  other_images_cloudinary_public_id:[String!]
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
##################### Rating #####################
"""
type Rating {
  _id: ID!
  value: Int!
  rater: User!
  comment:String
  good :Good!
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
##################### Orders #####################
"""
type Order {
  _id: ID!
  received_timestamp_UTC:String!
  processing_start_timestamp_UTC:String
  processing_end_timestamp_UTC:String
  shipping_start_timestamp_UTC:String
  shipping_end_timestamp_UTC:String
  delivered_timestamp_UTC:String
  status: String!
  customer: User!
  fulfillers:[BusinessUser!]!
  partial_orders: [PartialOrder!]!
  subtotal: Float!
  shipping_cost:Float!
  tax_cost:Float!
  order_items: [OrderGood!]!
}
type PartialOrder {
    _id: ID!
    new_timestamp_UTC:String!
    received_timestamp_UTC:String
    processing_start_timestamp_UTC:String
    processing_end_timestamp_UTC:String
    shipping_start_timestamp_UTC:String
    shipping_end_timestamp_UTC:String
    partial_subtotal: Float!
    partial_shipping_cost:Float!
    partial_tax_cost:Float!
    partial_order_status:String!
    fulfiller: BusinessUser
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
   ShippingCurrency:String!
}
"""
##################### Search #####################
"""
type Index {
  _id: ID!
  term: String!
  pages: [Good!]!
}
input searchInput{
    query:String!
    page_nr:Int!
}
"""
##################### Root Query #####################
"""
type RootQuery {
    product_feed(jwt_token:String!): [Good!]!
    search(searchInput:searchInput): [Good!]
    trending(country:String!):[Good!]
    recommend(jwt_token:String,nr:Int!):[Good!]
    autocomplete(query:String!):[Good!]
   
    businessLogin(email: String!, password: String!): AuthData!
    login(email: String!, password: String!,old_cart_id:String,image_URL:String,loginMethod:String!,fullname:String): AuthData!    
 
    individualUser(jwt_token: String!): User!
    individualGood(nr:Int!,jwt_token:String):Good!
    allGeneralCategories:[GeneralCategory!]!
    getAllMyListedGoods(jwt_token:String!): [Good!]
    individualCart(jwt_token: String!): ShoppingCart!
    ParcelDeliveryLocations(UserLatCoordinate: Float!,UserLonCoordinate: Float!):[ParcelDeliveryLocation!]
    numberOfGoodsInCartAndSubtotal(jwt_token: String!):[Float!]!
    
    orderGoods(orderInput: finalOrderInput!):Order!
    DeliveryCost(deliverycostInput:OrderInput):Float!
    DeliveryTimeEstimate(deliverytimeEstimateInput:OrderInput):String!
}
"""
##################### Root Mutation #####################
"""
type RootMutation {
    createBusinessUser(userInput: BusinessUserInput): BusinessUser!
    createUser(userInput: UserInput): String!
    verifyEmail(token:String):AuthData!
    resetPassword(email:String,password:String,mode:String!,token:String):Boolean!
    
    addParcelDeliveryLocation(provider:String!,name:String!,country:String!,x_coordinate:Float!,y_coordinate:Float!):ParcelDeliveryLocation!
    createGeneralCategory(name: String!):GeneralCategory!
    
    addPhysicalGood(goodInput: goodInput): Good!
    addToCart(cart_identifier: String!,good_id: ID!,quantity:Int!): ShoppingCart!
    showCheckout(checkoutInput:OrderInput):StripeCheckout!
    
}

schema {
    query: RootQuery
    mutation: RootMutation
}
`)
;