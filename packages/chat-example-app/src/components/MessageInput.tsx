import { createComponent } from '@napred/browser';
import gql from 'graphql-tag';
import React, { ChangeEvent, KeyboardEvent, useState } from 'react';
import { Mutation } from 'react-apollo';

const sendMessageMutation = gql`
  mutation SendMessageMutation($message: String!) {
    sendMessage(text: $message) {
      text
    }
  }
`;

const Input = createComponent('Input', 'input');

function MessageInput(props: any) {
  const [value, setValue] = useState('');

  return (
    <Mutation mutation={sendMessageMutation}>
      {sendMessage => (
        <Input
          onKeyUp={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && value.length > 0) {
              sendMessage({ variables: { message: value } }).then(() =>
                setValue(''),
              );
            }
          }}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setValue(e.currentTarget.value)
          }
          placeholder="Type something and press Enter"
          p={2}
          value={value}
          {...props}
        />
      )}
    </Mutation>
  );
}

export { MessageInput };
export default MessageInput;
