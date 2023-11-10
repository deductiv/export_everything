// import React from 'react'

export function booleanize (value) {
  if (value === undefined) {
    return false
  } else if (typeof value === 'string') {
    value = value.toLowerCase()
  }
  switch (value) {
    case true:
    case 'true':
    case 1:
    case '1':
    case 'on':
    case 'yes':
      return true
    default:
      return false
  }
}

// Convert an object to an HTTP query string (for Splunk configuration POST requests)
export function dictToQuerystring (d) {
  const queryList = []
  const itemList = Object.entries(d)
  for (const item of itemList) {
    const name = item[0]
    const val = encodeURIComponent(item[1])
    queryList.push(name + '=' + val)
  }
  // console.log('Query list: ' + query_list.toString())
  // Join list with & for query string
  return queryList.join('&')
}

// Convert REST API responses to a list of objects that translate to table rows
export function restToRows (configFile, restEntries, configColumns) {
  const rows = []
  // Get the names of fields from the columns definition
  const validFields = listTableFields(configColumns)
  // console.log(`Valid fields for ${configFile}: ${JSON.stringify(valid_fields)}`)
  for (const restEntry of restEntries) {
    const row = restEntry.content
    row.stanza = restEntry.name
    for (const key of Object.keys(row)) {
      // Sanitize the output from the API to only include our defined columns
      if (!validFields.includes(key)) {
        delete row[key]
      } else {
        // Find boolean fields and convert the values from strings
        for (const field of configColumns) {
          if (field.field === key && field.type === 'boolean') {
            row[key] = booleanize(row[key])
          }
        }
      }
    }
    rows.push(row)
  }
  return rows
}

export function listTableFields (l) {
  // l = List of dicts passed
  const fields = []

  for (const d of l) {
    fields.push(d.field)
  }
  return fields
}

export async function getAllUrls (urls) {
  try {
    const data = await Promise.all(
      urls.map(url =>
        fetch(url).then(
          (response) => response.json()
        )))
    return (data)
  } catch (error) {
    console.log(error)
    throw (error)
  }
}
