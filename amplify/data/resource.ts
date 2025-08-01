import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any unauthenticated user can "create", "read", "update", 
and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({
  EmergencyStatus: a.enum(['CREATED', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETE', 'REDIRECTED']),

  User: a.model({
    id: a.id().required(),
    firstname: a.string().required(),
    lastname: a.string().required(),
    dob: a.date().required(),
    email: a.email().required(),
    phone: a.phone(),
    homeaddress: a.string(),
    ICEname: a.string().required(),
    ICEphone: a.phone().required(),
    relationshipstatus: a.string().required(),

    

  }).authorization((allow) => [allow.owner()]),


  Emergency: a
    .model({
      content: a.string(),
      natid: a.string().required(),
      firstname: a.string().required(),
      lastname: a.string().required(),
      dob: a.date().required(),
      email: a.email(),
      phone: a.phone().required(),
      homeaddress: a.string(),
      ICEname: a.string().required(),
      ICEphone: a.phone().required(),
      relationshipstatus: a.string().required(),
      location: a.customType({
        lat: a.float(),
        long: a.float(),
      }),
      ambulanceLocation: a.customType({
        lat: a.float(),
        long: a.float(),
      }),
      status: a.ref('EmergencyStatus'),
      ambulanceId: a.id(),
      ambulance: a.belongsTo('Ambulance', 'ambulanceId'),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .secondaryIndexes((index) => [
      index('natid').sortKeys(['createdAt']).name('byNatidCreatedAt'),
    ])
    .authorization((allow) => [
    allow.authenticated().to(['read', 'create', 'update', 'delete']),
    allow.groups(['dispatcher', 'emergency-responders']).to(['create', 'read', 'update', 'delete'])
  ]),

  ManualCases: a
    .model({
      description: a.string(),
      natid: a.string(),
      firstname: a.string(),
      lastname: a.string(),
      dob: a.date(),  
      email: a.email(),
      phone: a.phone(),
      location: a.customType({
        lat: a.float(),
        long: a.float(),
      }),
      homeaddress: a.string(),
      ICEname: a.string(),
      ICEphone: a.phone(),
      relationshipstatus: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    
    .authorization((allow) => [
    allow.authenticated().to(['read', 'create', 'update']),
    allow.groups(['dispatcher', 'emergency-responders']).to(['create', 'read', 'update', 'delete'])
  ]),

  Ambulance: a.model({
    id: a.id().required(),
    name: a.string().required(),

    location: a.customType({
      lat: a.float(),
      long: a.float(),
    }),
    status: a.enum(['available', 'busy', 'offline']),
    emergencies: a.hasMany('Emergency', 'ambulanceId'),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  }).authorization((allow) => [
    allow.authenticated().to(['read', 'create', 'update','delete']),

    allow.groups(['dispatcher', 'emergency-responders']).to(['create', 'read', 'update', 'delete'])
  ]), 

  Locations: a.model({
    name: a.string(),
    type: a.enum(['defibrillator', 'hospital', 'safe_zone']),
    location: a.customType({
      lat: a.float(),
      long: a.float(),
    }),
    description: a.string(),
  }).authorization((allow) => [allow.authenticated()])

  
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
