import React from 'react';
import Messages from '../../Landlord/Messages';

const TenantMessages = ({ user }) => {
  return <Messages user={user} accessRole="tenant" />;
};

export default TenantMessages;
