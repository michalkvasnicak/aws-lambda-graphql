import React, { memo } from 'react';
import Box from './Box';

type Props = {
  odd: boolean;
  text: string;
};

const Message = memo(({ odd, text }: Props) => (
  <Box bgColor={odd ? '#eee' : undefined} p={2}>
    {text}
  </Box>
));

export { Message };
export default Message;
