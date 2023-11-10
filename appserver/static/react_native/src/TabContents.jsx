import React from 'react'

const configs = {
  general: {},
  credentials: {
    tableTitle:
  <div className='form form-complex'>
    <h2 className='ep'>Account Management</h2>
  </div>,
    tabDocs:
  <>
    <h1 className='ep'>Manage Credentials</h1>
    <div style={{ width: '700px', paddingBottom: '15px' }}>
      <p>Use this panel to configure accounts, passwords, and secrets/passphrases to associate with your configured connections and private keys.  </p>
      <ul>
        <li>All credentials are stored securely in the Splunk secret store.</li>
        <li>Users must have the list_storage_passwords capability to read the credentials added to their roles. This will not give them access to read all passwords, only those you explicitly share.</li>
        <li>Access is secured using native Splunk roles as configured on this dashboard.</li>
        <li>Credential objects are exported to all apps so they are available to this app's search commands and alert actions. </li>
        <li>Only the password field is used for storing passphrases (e.g. for private keys), but the username must still be populated with an arbitrary value.</li>
      </ul>
    </div>
  </>
  },
  ep_hec: {
    title: 'Export to Splunk HTTP Event Collector (ephec)',
    description: 'HTTP Event Collector',
    heading: 'Splunk HTTP Event Collector Connections',
    browsable: false,
    tableTitle: {},
    tabDocs:
  <>
    <p>Setup connections to Splunk HTTP Event Collector endpoints, including Cribl Stream.</p>
    <p>For Splunk Cloud, SSL will always be enabled and validation forced, per Splunk policy.</p>
  </>
  },
  ep_aws_s3: {
    title: 'Export to AWS S3 (epawss3)',
    description: 'S3-Compatible',
    heading: 'S3-Compatible Connections',
    browsable: true,
    tableTitle: {},
    tabDocs:
  <>
    <p>Setup connections for AWS S3-compatible object storage repositories. These include, but are not limited to:</p>
    <ul>
      <li>S3</li>
      <li>Google Cloud Storage</li>
      <li>Oracle Cloud Infrastructure Object Storage</li>
      <li>MinIO</li>
      <li>Ceph</li>
    </ul>
    <p>For non-Amazon repositories, an endpoint URL must be specified and the region is generally 'us-east-1' (unless the vendor documentation states otherwise).</p>
    <p>To avoid IAM key issuance and rotation, we recommend assigning an IAM role to your Splunk search head EC2 instance(s) and granting AWS permissions to the IAM role. Then, select '[Use ARN]' to authenticate using the ARN credentials from AWS STS.</p>
  </>
  },
  ep_azure_blob: {
    title: 'Export to Azure Blob & Data Lake (epazureblob)',
    description: 'Azure Blob',
    heading: 'Azure Blob & Data Lake v2 Connections',
    browsable: true,
    tableTitle: {},
    tabDocs:
  <>
    <p>Setup connections for Azure Blob object storage or Data Lake repositories.  Please note:</p>
    <ul>
      <li>If Azure AD is selected, the credential's Username must be the application ID and the Realm must be the the Tenant ID.</li>
      <li>Storage accounts with hierarchical namespace enabled must have the Type set to Data Lake.</li>
      <li>Browse functionality requires the 'Storage Blob Data Contributor' role assignment on storage accounts, in addition to the 'Storage Queue Data Contributor' role on Data Lake storage accounts.</li>
    </ul>
  </>
  },
  ep_box: {
    title: 'Export to Box (epbox)',
    description: 'Box.com',
    heading: 'Box Connections',
    browsable: true,
    tableTitle: {},
    tabDocs:
  <>
    <p>Setup connections to Box.com account(s).</p>
    <p>In your <a href='https://app.box.com/developers/console/newapp'>Box Admin Console</a>, create a new Custom App with Server Authentication (with JWT) and create a new key pair to get this information. Then, submit the new app for authorization.</p>
  </>
  },
  ep_sftp: {
    title: 'Export to SFTP (epsftp)',
    description: 'SFTP',
    heading: 'SFTP Connections',
    browsable: true,
    tableTitle: {},
    tabDocs:
  <>
    <p>Setup connections to SFTP (SSH File Transfer Protocol) endpoints.</p>
    <p>Choose from one of the following. Note that the username will always be retrieved from the referenced 'password' credential.</p>
    <ul>
      <li>Password authentication; no private key required.</li>
      <li>Public key authentication with unencrypted private key (not recommended); no password required (specify a password credential to reference the username). Not permitted in Splunk Cloud.</li>
      <li>Public key authentication with encrypted private key; no password required (specify a password credential to reference the username), passphrase required.</li>
    </ul>
    <p>If a password is present in your credential and a private key is also specified, the private key will be used for authentication.</p>
  </>
  },
  ep_smb: {
    title: 'Export to SMB (epsmb)',
    description: 'SMB',
    heading: 'SMB Connections',
    browsable: true,
    tableTitle: {},
    tabDocs:
  <p>Setup connections to Windows SMB/CIFS file shares.</p>
  }
}
export function TabContents (config) {
  return configs[config]
}

export function TabDocs (props) {
  return TabContents(props.config).tabDocs
}
