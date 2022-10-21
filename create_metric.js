let assert = require('assert');
let _ = require("lodash");

const METRIC_ID = "customItemsListDuration"
const METRIC_NAME = "Custom Items List Duration"
const NAMESPACE = "awsapp"
const MONITOR_ID = "awsappmonitor"
const MONITOR_NAME = "Custom Items List Synthetic Script"

const NEW_RELIC_DATA_CENTER_LOCATION = "EU"
const NEW_RELIC_LICENSE_KEY = $secure.NEW_RELIC_LICENSE_KEY

const INGEST_METRIC_ENDPOINT = NEW_RELIC_DATA_CENTER_LOCATION === "EU" ? "metric-api.eu.newrelic.com" : "metric-api.newrelic.com" 

const makeHttpGetRequest = async function(options) {
  let success

  await $http.get(options, function(err, response, body) {
    console.log(`Status code: ${response.statusCode}`)
    if (err) {
      console.log(`Http request failed: ${err}`)
      success = false
    } else {
      console.log("Http request succeeded.")
      success = true
    }
  });

  return success
}

const measureResponseDuration = async function () {
  let options = {
    url: "http://LoadBalancer-52725342.eu-west-1.elb.amazonaws.com/proxy/list?limit=5",
    headers :{
      "Content-Type": "application/json",
    },
  }

  console.log("Making request to application...")

  var startDate = new Date()
  await makeHttpGetRequest(options)
  let duration = parseFloat(parseFloat(new Date() - startDate).toFixed(2))

  console.log(`Execution time: ${duration}`) // milliseconds

  return duration
}

const makeHttpPostRequest = async function(options) {
  let success

  await $http.post(options, function(err, response, body) {
    console.log(`Status code: ${response.statusCode}`)
    if (err) {
      console.log(`Http request failed: ${err}`)
      success = false
    } else {
      console.log("Http request succeeded.")
      success = true
    }
  });

  return success
}

const sendDataToNewRelic = async function(data) {
  let options = {
    url: `https://${INGEST_METRIC_ENDPOINT}/metric/v1`,
    headers :{
      "Content-Type": "application/json",
      "Api-Key": NEW_RELIC_LICENSE_KEY
    },
    body: JSON.stringify(data)
  }

  console.log(`Sending ${data[0].metrics.length} records to NR metrics API...`)

  return await makeHttpPostRequest(options)
}

function createMetricPayload(value) {
  let attributes = {}
  attributes[`${NAMESPACE}.id`] = METRIC_ID
  attributes[`${NAMESPACE}.name`] = METRIC_NAME

  let metricPayload = {
    name: `${NAMESPACE}.value`,
    type: "gauge",
    value: value,
    timestamp: Math.round(Date.now()/1000),
    attributes: attributes
  }

  return metricPayload
}

// --- SCRIPT START --- //

try {

  const duration = await measureResponseDuration()
  console.log(duration)

  let metricsPayload = []
  metricsPayload.push(createMetricPayload(duration))
  
  let commonMetricBlock = {"attributes": {}}
  commonMetricBlock.attributes[`${NAMESPACE}.monitorName`] = MONITOR_NAME
  commonMetricBlock.attributes[`${NAMESPACE}.monitorId`] = MONITOR_ID

  let payload = [{ 
    "common" : commonMetricBlock,
    "metrics": metricsPayload
  }]

  // Comment the line below to see yout payload.
  // console.log(JSON.stringify(payload))
  
  let success = await sendDataToNewRelic(payload)
  if (success === true) {
    console.log("Metrics are sent to New Relic successfully.")
    assert.ok("Succeeded.")
  } else {
    console.log("Metrics are failed to be sent to New Relic.")
    assert.fail("Failed.")
  }
} catch (e) {
  console.log("Unexpected errors occured: ", e)
  assert.fail("Failed.")
}
