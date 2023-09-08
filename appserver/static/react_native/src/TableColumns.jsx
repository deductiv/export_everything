import React from 'react'
import { FormControl, TextField, Select, MenuItem } from '@material-ui/core'
import tableStyles from './TableStyles'
import { validators } from './Validators'
import c from './Constants'

export function getColumns (
  users = [],
  roles = [],
  passwords = [],
  isSplunkCloud = false
) {
  const columns = {
    ep_hec: [
      { title: 'Stanza', key: 'stanza', field: 'stanza', hidden: true },
      // actions = 10%
      {
        title: 'Default',
        key: 'default',
        field: 'default',
        type: 'boolean',
        width: '5%',
        headerStyle: tableStyles.centerHeaderStyles,
        cellStyle: tableStyles.centerCellStyles
      },
      {
        title: 'Name/Alias',
        key: 'alias',
        field: 'alias',
        width: '20%',
        validate: rowData => validators.string(rowData.alias).isValid
      },
      {
        title: 'Hostname',
        key: 'host',
        field: 'host',
        width: '25%',
        validate: rowData => validators.string(rowData.host).isValid
      },
      {
        title: 'TCP Port',
        key: 'port',
        field: 'port',
        width: '10%',
        validate: rowData => (validators.number(rowData.port).isValid || rowData.port == null || rowData.port === '')
      },
      {
        title: 'HEC Token',
        key: 'token',
        field: 'token',
        width: '20%',
        validate: rowData => validators.uuid(rowData.token).isValid
      },
      {
        title: 'SSL',
        key: 'ssl',
        field: 'ssl',
        type: 'boolean',
        width: '5%',
        initialEditValue: true,
        headerStyle: tableStyles.centerHeaderStyles,
        cellStyle: tableStyles.centerCellStyles,
        // Force SSL to true for Splunk Cloud
        validate: rowData => (isSplunkCloud ? validators.is_true(rowData.ssl) : validators.bool(rowData.ssl))
      },
      {
        title: 'Verify SSL',
        key: 'ssl_verify',
        field: 'ssl_verify',
        type: 'boolean',
        width: '5%',
        initialEditValue: true,
        headerStyle: tableStyles.centerHeaderStyles,
        cellStyle: tableStyles.centerCellStyles,
        // Force Verify SSL to true for Splunk Cloud
        validate: rowData => (isSplunkCloud ? validators.is_true(rowData.ssl_verify) : validators.bool(rowData.ssl_verify))
      }
    ],
    ep_aws_s3: [
      { title: 'Stanza', key: 'stanza', field: 'stanza', hidden: true },
      // actions = 10%
      {
        title: 'Default',
        key: 'default',
        field: 'default',
        type: 'boolean',
        width: '5%',
        headerStyle: tableStyles.centerHeaderStyles,
        cellStyle: tableStyles.centerCellStyles
      },
      {
        title: 'Name/Alias',
        key: 'alias',
        field: 'alias',
        width: '20%',
        validate: rowData => validators.string(rowData.alias)
      },
      {
        title: 'Access Key',
        key: 'credential',
        field: 'credential',
        width: '15%',
        editComponent: props =>
          <FormControl>
            <Select
              id='credential'
              name='credential'
              style={{ width: '150px' }}
              defaultValue={props.value ?? '[EC2 ARN]'}
              onChange={e => { props.onChange(e.target.value) }}
            >
              <MenuItem value=''>None</MenuItem>
              <MenuItem value='[EC2 ARN]'>Use EC2 ARN</MenuItem>
              {passwords.map(credential =>
                <MenuItem key={credential.stanza} value={credential.stanza}> {credential.stanza}</MenuItem>
              )}
            </Select>
          </FormControl>
      },
      {
        title: 'Region',
        key: 'region',
        field: 'region',
        width: '10%',
        validate: rowData => validators.string(rowData.region).isValid
      },
      { title: 'Endpoint URL', key: 'endpoint_url', field: 'endpoint_url', width: '20%' },
      { title: 'Default Bucket ID', key: 'default_s3_bucket', field: 'default_s3_bucket', width: '20%' },
      {
        title: 'Compress Output',
        key: 'compress',
        field: 'compress',
        type: 'boolean',
        width: '5%',
        headerStyle: tableStyles.centerHeaderStyles,
        cellStyle: tableStyles.centerCellStyles
      }
    ],
    ep_azure_blob: [
      { title: 'Stanza', key: 'stanza', field: 'stanza', hidden: true },
      // actions = 10%
      {
        title: 'Default',
        key: 'default',
        field: 'default',
        type: 'boolean',
        width: '5%',
        headerStyle: tableStyles.centerHeaderStyles,
        cellStyle: tableStyles.centerCellStyles
      },
      {
        title: 'Name/Alias',
        key: 'alias',
        field: 'alias',
        width: '15%',
        validate: rowData => validators.string(rowData.alias)
      },
      {
        title: 'Storage Account Name',
        key: 'storage_account',
        field: 'storage_account',
        width: '25%',
        validate: rowData => validators.string(rowData.storage_account)
      },
      {
        title: 'Account Key (Credential)',
        key: 'credential',
        field: 'credential',
        width: '15%',
        editComponent: props =>
          <FormControl>
            <Select
              id='credential'
              name='credential'
              style={{ width: '200px' }}
              defaultValue={props.value === undefined ? '' : props.value}
              onChange={e => { props.onChange(e.target.value) }}
            >
              <MenuItem value=''>None</MenuItem>
              {passwords.map(credential =>
                <MenuItem key={credential.stanza} value={credential.stanza}> {credential.stanza}</MenuItem>
              )}
            </Select>
          </FormControl>
      },
      {
        title: 'Azure AD',
        key: 'azure_ad',
        field: 'azure_ad',
        type: 'boolean',
        width: '5%',
        headerStyle: tableStyles.centerHeaderStyles,
        cellStyle: tableStyles.centerCellStyles
      },
      {
        title: 'Azure AD Authority',
        key: 'azure_ad_authority',
        field: 'azure_ad_authority',
        width: '15%',
        render: rowData => <span>{c.azureADAuthorities[rowData.azure_ad_authority]}</span>,
        editComponent: props =>
          <FormControl>
            <Select
              id='azure_ad_authority'
              name='azure_ad_authority'
              disabled={!props.rowData.azure_ad}
              style={{ width: '80px' }}
              defaultValue={props.value === undefined ? '' : props.value}
              onChange={e => { props.onChange(e.target.value) }}
            >
              <MenuItem key='' value=''>N/A</MenuItem>
              {Object.entries(c.azureADAuthorities)
                .map(([key, value]) => <MenuItem key={key} value={key}> {value}</MenuItem>
                )}
            </Select>
          </FormControl>
      },
      {
        title: 'Type',
        key: 'type',
        field: 'type',
        width: '10%',
        render: rowData => <span>{c.azureBlobTypes[rowData.type]}</span>,
        editComponent: props =>
          <FormControl>
            <Select
              id='type'
              name='type'
              style={{ width: '80px' }}
              defaultValue={props.value === undefined ? '' : props.value}
              onChange={e => { props.onChange(e.target.value) }}
            >
              {Object.entries(c.azureBlobTypes)
                .map(([key, value]) => <MenuItem key={key} value={key}> {value}</MenuItem>
                )}
            </Select>
          </FormControl>
      },
      { title: 'Default Container', key: 'default_container', field: 'default_container', width: '20%' },
      {
        title: 'Compress Output',
        key: 'compress',
        field: 'compress',
        type: 'boolean',
        width: '5%',
        headerStyle: tableStyles.centerHeaderStyles,
        cellStyle: tableStyles.centerCellStyles
      }
    ],
    ep_box: [
      { title: 'Stanza', key: 'stanza', field: 'stanza', hidden: true },
      // actions = 10%
      {
        title: 'Default',
        key: 'default',
        field: 'default',
        type: 'boolean',
        width: '5%',
        headerStyle: tableStyles.centerHeaderStyles,
        cellStyle: tableStyles.centerCellStyles
      },
      {
        title: 'Name/Alias',
        key: 'alias',
        field: 'alias',
        width: '14%',
        validate: rowData => validators.string(rowData.alias).isValid
      },
      {
        title: 'Enterprise ID',
        key: 'enterprise_id',
        field: 'enterprise_id',
        width: '10%',
        validate: rowData => validators.string(rowData.enterprise_id).isValid
      },
      {
        title: 'Client Credential',
        key: 'client_credential',
        field: 'client_credential',
        width: '10%',
        editComponent: props =>
          <FormControl>
            <Select
              id='client_credential'
              name='client_credential'
              style={{ width: '150px' }}
              defaultValue={props.value}
              onChange={e => { props.onChange(e.target.value) }}
            >
              <MenuItem value=''>None</MenuItem>
              {passwords.map(credential =>
                <MenuItem key={credential.stanza} value={credential.stanza}> {credential.stanza}</MenuItem>
              )}
            </Select>
          </FormControl>
      },
      {
        title: 'Public Key ID',
        key: 'public_key_id',
        field: 'public_key_id',
        width: '9%',
        validate: rowData => validators.string(rowData.public_key_id)
      },
      {
        title: 'Private Key',
        key: 'private_key',
        field: 'private_key',
        width: '25%',
        cellStyle: { wordBreak: 'keep-all' },
        validate: rowData => validators.string(rowData.private_key).isValid,
        render: rowData => <span className='password_field'> {((rowData.private_key === undefined || rowData.private_key === '') ? '' : '[configured]')}</span>,
        editComponent: ({ value, onChange }) => (
          <TextField
            error={(value == null || !validators.string(value).isValid)}
            onChange={e => { onChange(e.target.value) }}
            value={value}
            placeholder='Private Key'
            multiline
            minRows={1}
            maxRax={4}
          />)
      },
      {
        title: 'Passphrase Credential',
        key: 'passphrase_credential',
        field: 'passphrase_credential',
        width: '15%',
        editComponent: props =>
          <FormControl>
            <Select
              id='passphrase_credential'
              name='passphrase_credential'
              style={{ width: '150px' }}
              defaultValue={props.value}
              onChange={e => { props.onChange(e.target.value) }}
            >
              <MenuItem value=''>None</MenuItem>
              {passwords.map(credential =>
                <MenuItem key={credential.stanza} value={credential.stanza}> {credential.stanza}</MenuItem>
              )}
            </Select>
          </FormControl>
      },
      { title: 'Default Folder', key: 'default_folder', field: 'default_folder', width: '20%' },
      {
        title: 'Compress Output',
        key: 'compress',
        field: 'compress',
        type: 'boolean',
        width: '15%',
        headerStyle: tableStyles.centerHeaderStyles,
        cellStyle: tableStyles.centerCellStyles
      }
    ],
    ep_sftp: [
      { title: 'Stanza', key: 'stanza', field: 'stanza', hidden: true },
      // actions = 10%
      {
        title: 'Default',
        key: 'default',
        field: 'default',
        type: 'boolean',
        width: '5%',
        headerStyle: tableStyles.centerHeaderStyles,
        cellStyle: tableStyles.centerCellStyles
      },
      {
        title: 'Name/Alias',
        key: 'alias',
        field: 'alias',
        width: '14%',
        validate: rowData => validators.string(rowData.alias).isValid
      },
      {
        title: 'Hostname',
        key: 'host',
        field: 'host',
        width: '20%',
        validate: rowData => validators.string(rowData.host).isValid
      },
      {
        title: 'TCP Port',
        key: 'port',
        field: 'port',
        width: '10%',
        validate: rowData => (validators.number(rowData.port).isValid || rowData.port == null || rowData.port === '')
      },
      {
        title: 'User Credential',
        key: 'credential',
        field: 'credential',
        width: '15%',
        editComponent: props =>
          <FormControl>
            <Select
              id='credential'
              name='credential'
              style={{ width: '150px' }}
              defaultValue={props.value}
              onChange={e => { props.onChange(e.target.value) }}
            >
              <MenuItem value=''>None</MenuItem>
              {passwords.map(credential =>
                <MenuItem key={credential.stanza} value={credential.stanza}> {credential.stanza}</MenuItem>
              )}
            </Select>
          </FormControl>
      },
      {
        title: 'Private Key',
        key: 'private_key',
        field: 'private_key',
        width: '36%',
        cellStyle: { wordBreak: 'keep-all' },
        render: rowData => <span className='password_field'> {((rowData.private_key === undefined || rowData.private_key === '') ? '' : '[configured]')}</span>,
        validate: rowData =>
          (isSplunkCloud && rowData.private_key !== undefined && rowData.private_key !== '' && (rowData.passphrase_credential === '' || rowData.passphrase_credential === undefined))
            ? { isValid: false, helperText: 'Cannot be unencrypted in Splunk Cloud. Select a decryption credential.' }
            : { isValid: true, helperText: '' },
        editComponent: props => (
          <TextField
            error={validators.string(props.value).isValid && (props.rowData.passphrase_credential == null || props.rowData.passphrase_credential === '') && isSplunkCloud}
            helperText={props.error && props.helperText}
            onChange={e => { props.onChange(e.target.value) }}
            value={props.value}
            placeholder='Private Key'
            multiline
            minRows={1}
            maxRax={4}
          />)
      },
      {
        title: 'Passphrase Credential',
        key: 'passphrase_credential',
        field: 'passphrase_credential',
        width: '15%',
        // Force using a passphrase / encrypting the private key in Splunk Cloud
        editComponent: props =>
          <FormControl>
            <Select
              id='passphrase_credential'
              name='passphrase_credential'
              style={{ width: '150px' }}
              defaultValue={props.value}
              onChange={e => { props.onChange(e.target.value) }}
            >
              <MenuItem value=''>None</MenuItem>
              {passwords.map(credential =>
                <MenuItem key={credential.stanza} value={credential.stanza}> {credential.stanza}</MenuItem>
              )}
            </Select>
          </FormControl>
      },
      { title: 'Default Folder', key: 'default_folder', field: 'default_folder', width: '20%' },
      {
        title: 'Compress Output',
        key: 'compress',
        field: 'compress',
        type: 'boolean',
        width: '20%',
        headerStyle: tableStyles.centerHeaderStyles,
        cellStyle: tableStyles.centerCellStyles
      }
    ],
    ep_smb: [
      { title: 'Stanza', key: 'stanza', field: 'stanza', hidden: true },
      // actions = 10%
      {
        title: 'Default',
        key: 'default',
        field: 'default',
        type: 'boolean',
        width: '5%',
        headerStyle: tableStyles.centerHeaderStyles,
        cellStyle: tableStyles.centerCellStyles
      },
      {
        title: 'Name/Alias',
        key: 'alias',
        field: 'alias',
        width: '14%',
        validate: rowData => validators.string(rowData.alias)
      },
      {
        title: 'Hostname',
        key: 'host',
        field: 'host',
        width: '35%',
        validate: rowData => validators.string(rowData.host)
      },
      {
        title: 'Credential',
        key: 'credential',
        field: 'credential',
        width: '15%',
        editComponent: props =>
          <FormControl>
            <Select
              id='credential'
              name='credential'
              style={{ width: '150px' }}
              defaultValue={props.value}
              onChange={e => { props.onChange(e.target.value) }}
            >
              <MenuItem value=''>None</MenuItem>
              {passwords.map(credential =>
                <MenuItem key={credential.stanza} value={credential.stanza}> {credential.stanza}</MenuItem>
              )}
            </Select>
          </FormControl>
      },
      {
        title: 'Share Name',
        key: 'share_name',
        field: 'share_name',
        width: '15%',
        validate: rowData => validators.string(rowData.share_name).isValid
      },
      { title: 'Default Folder', key: 'default_folder', field: 'default_folder', width: '20%' },
      {
        title: 'Compress Output',
        key: 'compress',
        field: 'compress',
        type: 'boolean',
        width: '5%',
        headerStyle: tableStyles.centerHeaderStyles,
        cellStyle: tableStyles.centerCellStyles
      }
    ],
    passwords: [
      // actions = 10%
      {
        title: 'Username',
        key: 'username',
        field: 'username',
        width: '15%',
        validate: rowData => validators.string(rowData.username).isValid,
        editComponent: props => (
          // Don't allow input if this has been saved once already
          // Stanza components can't be changed (username, realm)
          (props.rowData.id && <span> {props.rowData.username}</span>) ||
            <TextField
              value={props.value ?? ''}
              inputProps={{ placeholder: 'Username' }}
              onChange={e => { props.onChange(e.target.value) }}
            />)
      },
      {
        title: 'Password',
        key: 'password',
        field: 'password',
        width: '15%',
        validate: rowData => validators.string(rowData.password).isValid,
        render: rowData => <span className='password_field'> {((rowData.password === undefined || rowData.password === '') ? '' : '*'.repeat(8))}</span>,
        editComponent: props => (
          <TextField
            error={(props.value == null || !validators.string(props.value).isValid)}
            type='password'
            value={props.value ?? ''}
            inputProps={{ placeholder: 'Password' }}
            onChange={e => { props.onChange(e.target.value) }}
          />)
      },
      {
        title: 'Realm/Domain',
        key: 'realm',
        field: 'realm',
        width: '15%',
        editComponent: props => (
          // Don't allow input if this has been saved once already
          // Stanza components can't be changed (username, realm)
          (props.rowData.id && <span> {props.rowData.realm}</span>) ||
            <TextField
              value={props.value ?? ''}
              inputProps={{ placeholder: 'Realm' }}
              onChange={e => { props.onChange(e.target.value) }}
            />)
      },
      {
        title: 'Owner',
        key: 'owner',
        field: 'owner',
        width: '10%',
        editComponent: props =>
          <FormControl>
            <Select
              id='owner'
              name='owner'
              style={{ width: '150px' }}
              value={props.value ?? 'nobody'}
              // inputProps={{ ref: credentialOwnerRef }}
              // value= { !props.value ? 'nobody' : props.value }
              onChange={e => props.onChange(e.target.value)}
            >
              <MenuItem key='nobody' value='nobody'>nobody</MenuItem>
              {users.map(user => (
                <MenuItem key={user.name} value={user.name}> {user.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
      },
      {
        title: 'Read',
        key: 'read',
        field: 'read',
        width: '20%',
        render: rowData =>
          <span>
            {
              (rowData.read && (Array.isArray(rowData.read) ? rowData.read : [rowData.read]).join(', ').replace('*', 'All')) ??
              ''
            }
          </span>,
        editComponent: props =>
          <FormControl>
            <Select
              id='read'
              name='read'
              style={{ width: '180px' }}
              value={((Array.isArray(props.value) && props.value) || (props.value && [props.value])) ?? ['*']}
              // inputProps={{ ref: props.credentialReadRef }}
              multiple
              onChange={e => { props.onChange(e.target.value) }}
              renderValue={selected => {
                selected = selected.filter((role) => role !== '')
                if (selected.length === 0) {
                  return <em>Select...</em>
                }
                // This will return a comma-separated list of the values.
                return selected.join(', ').replace('*', 'All')
              }}
            >
              <MenuItem key='*' value='*'>All</MenuItem>
              {roles.map(role =>
                <MenuItem key={role.name} value={role.name}> {role.name}</MenuItem>
              )}
            </Select>
            {/* <Multiselect
              inputId='read'
              name='read'
              menuStyle={{ width: '180px' }}
              inputProps={{ ref: credentialReadRef }}
              // values={roles.map}
              // defaultValue={(Array.isArray(props.value) && props.value) || (props.value && [props.value]) || ['*']}
              inline
            >
              <Multiselect.Option label='All' value='*' />
            </Multiselect> */}
          </FormControl>
      },
      {
        title: 'Write',
        key: 'write',
        field: 'write',
        width: '20%',
        render: rowData =>
          <span>
            {
              (rowData.write && (Array.isArray(rowData.write) ? rowData.write : [rowData.write]).join(', ').replace('*', 'All')) ??
              ''
            }
          </span>,
        editComponent: props =>
          <FormControl>
            <Select
              id='write'
              name='write'
              style={{ width: '180px' }}
              value={((Array.isArray(props.value) && props.value) || (props.value && [props.value])) ?? ['*']}
              // inputProps={{ ref: credentialWriteRef }}
              multiple
              onChange={e => { props.onChange(e.target.value) }}
              renderValue={selected => {
                selected = selected.filter((role) => role !== '')
                if (selected.length === 0) {
                  return <em>Select...</em>
                }
                // This will return a comma-separated list of the values.
                return selected.join(', ').replace('*', 'All')
              }}
            >
              <MenuItem key='*' value='*'>All</MenuItem>
              {roles.map(role =>
                <MenuItem key={role.name} value={role.name}> {role.name}</MenuItem>
              )}
            </Select>
          </FormControl>
      }
    ]
  }
  return columns
}
