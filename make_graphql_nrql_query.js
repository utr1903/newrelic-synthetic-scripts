let assert = require("assert");
let _ = require("lodash");

const NEWRELIC_ACCOUNT_ID = $secure.NEWRELIC_ACCOUNT_ID;
const NEWRELIC_DATA_CENTER_LOCATION = "EU";
const NEWRELIC_USER_API_KEY = $secure.NEWRELIC_USER_API_KEY;

const NEWRELIC_GRAPHQL_ENDPOINT =
  NEWRELIC_DATA_CENTER_LOCATION === "EU"
    ? "https://api.eu.newrelic.com/graphql"
    : "https://api.newrelic.com/graphql";

const createGraphQlQuery = function () {
  return JSON.stringify({
    query: `{
      actor {
        account(id: ${NEWRELIC_ACCOUNT_ID}) {
          nrql(query: "FROM Log SELECT count(*) WHERE message LIKE '%YO_DAWG%' SINCE 260 minutes ago") {
            results
          }
        }
      }
    }`,
  });
};

const makeHttpPostRequest = async function (options) {
  let responseBody;
  await $http.post(options, function (err, res, body) {
    console.log(`Status code: ${res.statusCode}`);
    if (err) {
      console.log(`GraphQL request failed: ${err}`);
      assert.fail("Failed.");
    } else {
      console.log("GraphQL request performed.");
      responseBody = res.body;
      console.log("Response:", responseBody);

      if (res.statusCode == 200) {
        console.log("GraphQL request suceeded.");
      } else {
        console.log("GraphQL request failed.");
        assert.fail("Failed.");
      }
    }
  });

  return responseBody;
};

const performGraphQlQuery = async function (query) {
  let options = {
    url: `${NEWRELIC_GRAPHQL_ENDPOINT}`,
    headers: {
      "Content-Type": "application/json",
      "API-Key": NEWRELIC_USER_API_KEY,
    },
    body: query,
  };

  console.log("Making call to New Relic GraphQL endpoint...");

  return await makeHttpPostRequest(options);
};

const parseResponseBody = function (responseBodyAsString) {
  let requestBody = JSON.parse(responseBodyAsString);
  return requestBody.data.actor.account.nrql.results[0].count;
};

// -------------------- //
// --- SCRIPT START --- //
// -------------------- //
try {
  let query = createGraphQlQuery();
  let responseBodyAsString = await performGraphQlQuery(query);
  let numLogs = parseResponseBody(responseBodyAsString);
  console.log("Number of logs:", numLogs);

  if (numLogs == 0) {
    assert.fail("No logs have been found!");
  } else {
    assert.ok("Specified logs have been found.");
  }
} catch (e) {
  console.log("Unexpected errors occured: ", e);
  assert.fail("Failed.");
}
// -------------------- //
