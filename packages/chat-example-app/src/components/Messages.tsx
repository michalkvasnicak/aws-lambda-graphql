import gql from 'graphql-tag';
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { OnSubscriptionDataOptions, useSubscription } from 'react-apollo';
import { Box } from './Box';
import { Message } from './Message';

type Message = {
  id: string;
  text: string;
};

const messageFeedSubscription = gql`
  subscription MessageFeed {
    messageFeed {
      id
      text
    }
  }
`;

// @TODO subscribe after client is connected
// find out why tests in ws link are ok but app is not subscribing
function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const onSubscriptionData = useCallback(
    (result: OnSubscriptionDataOptions) => {
      if (result.subscriptionData.data != null) {
        setMessages(state => [
          ...state,
          result.subscriptionData.data.messageFeed,
        ]);
      }
    },
    [],
  );
  const listRef = useRef<HTMLDivElement>(null);

  useSubscription(messageFeedSubscription, { onSubscriptionData });

  useEffect(() => {
    // scroll down
    if (listRef.current != null) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  });

  return (
    <Box height="100%" mb={2} overflow="scroll" ref={listRef}>
      {messages.map((message, i) => (
        <Message key={message.id} odd={i % 2 === 0} text={message.text} />
      ))}
    </Box>
  );
}

export { Messages };
export default Messages;
