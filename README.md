# FCC Consumer Complaint Tracker: Telecom & Robocall Data

```json
{
  "complaintId": "9126420",
  "ticketCreated": "2026-09-19T04:50:38.000Z",
  "issueType": "Phone",
  "issue": "Billing",
  "method": "Wireless (cell phone/other mobile device)",
  "callerIdNumber": null,
  "advertiserPhoneNumber": null,
  "city": "Mountain view",
  "state": "CA",
  "zip": "94040",
  "location": [-122.08032, 37.37879]
}
```

That's a real record from today. Give it a state, issue type, and/or lookback window, get back consumer complaints about phone, TV, internet, and radio service straight from the FCC's own open data feed, most recent first.

## Who this is for

- **Telecom carrier compliance teams** monitoring complaint volume and category trends by state.
- **Robocall and spam researchers** tracking unwanted call complaint patterns over time.
- **Journalists and consumer advocates** reporting on telecom service issues by region.

## Input

| Field | Type | Description |
|---|---|---|
| `state` | string | Two-letter US state code, e.g. `"CA"`. Leave blank for all states. |
| `issueType` | string | One of `Phone`, `TV`, `Internet`, `Radio`, `Accessibility`, `Emergency`, `Broadband Story`, `Request for Dispute Assistance`. Leave blank for all types. |
| `daysBack` | integer (default `30`) | How far back to search. |
| `maxResults` | integer (default `50`) | Cap on records returned, most recent first. |

```json
{
  "state": "CA",
  "issueType": "Phone",
  "daysBack": 30,
  "maxResults": 50
}
```

## Output

One record per complaint: a ticket ID, when it was filed, issue type and specific issue category, contact method, the caller ID number and advertiser phone number when the complaint included them, and location (city, state, zip, coordinates).

## How it works

A direct call to the FCC's own open data endpoint (Socrata), no scraping, no key, no proxy. Filters (state, issue type, date range) are applied server side via the endpoint's own query syntax, verified directly against live data rather than assumed from documentation.

Retries with exponential backoff on transient failures, the same defensive fetch pattern used across every actor in this portfolio.

## Related products

- [Vehicle Complaint Tracker](https://github.com/timmKal01/vehicle-complaint-tracker): the same raw-consumer-complaint pattern applied to NHTSA vehicle data instead of telecom
- [Consumer Complaint Tracker](https://github.com/timmKal01/consumer-complaint-tracker): CFPB financial-services complaints, for banking and lending instead of telecom
