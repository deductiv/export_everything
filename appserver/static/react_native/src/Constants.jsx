const c = {
  azureADAuthorities: {
    AZURE_PUBLIC_CLOUD: 'Azure Public Cloud',
    AZURE_CHINA: 'Azure China',
    AZURE_GERMANY: 'Azure Germany',
    AZURE_GOVERNMENT: 'Azure US Government'
  },

  azureBlobTypes: {
    blob: 'Blob',
    datalake: 'Data Lake'
  },

  // Shown in the file browser as the type of the connection
  configDescriptions: {
    ep_hec: 'HTTP Event Collector',
    ep_aws_s3: 'S3-Compatible',
    ep_azure_blob: 'Azure Blob',
    ep_box: 'Box',
    ep_sftp: 'SFTP',
    ep_smb: 'SMB'
  }

}

// Options for notistack - Event notification/alerting library - Success/fail on table operations
export const notistackOptions = (variant) => {
  return {
    variant,
    autoHideDuration: 3000
  }
}

export default c
