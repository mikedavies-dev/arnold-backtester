import {useState, useCallback} from 'react';

import {Box, render, Text} from 'ink';
import TextInput from 'ink-text-input';
import StatusLine from '../components/StatusLine';
import {Table} from '../components/Table';

// import useInterval from '../../hooks/use-interval';
import useScreenSize from '../../hooks/use-screensize';
import {Separator} from '../components/Separator';

type TableData = {
  id: string;
  dateTime: string;
  name: string;
  email: string;
  gender: string;
  age: number;
  phone: string;
};

const data: Array<TableData> = [
  {
    id: '1',
    name: 'Sosa Saunders',
    gender: 'male',
    age: 17,
    email: 'sosa.saunders@mail.com',
    phone: '+1 (809) 435-2786',
    dateTime: '2023-01-15 12:12:11',
  },
  {
    id: '2',
    name: 'Angelina Kirk',
    gender: 'female',
    age: 3,
    email: 'angelina@kirk.io',
    phone: '+1 (870) 567-3516',
    dateTime: '2023-01-15 12:12:11',
  },
  {
    name: 'Bradford Rosales',
    id: '3',
    gender: 'male',
    age: 20,
    email: 'bradfordrosales@fast.com',
    phone: '+1 (918) 573-3240',
    dateTime: '2023-01-15 12:12:11',
  },
  {
    id: '4',
    name: 'Gwen Schroeder',
    gender: 'female',
    age: 17,
    email: 'gwen@corp.xyz',
    phone: '+1 (987) 417-2062',
    dateTime: '2023-01-15 12:12:11',
  },
  {
    id: '5',
    name: 'Ellison Mann',
    gender: 'male',
    age: 5,
    email: 'ellisonmann@katakana.com',
    phone: '+1 (889) 411-2186',
    dateTime: '2023-01-15 12:12:11',
  },
  {
    id: '6',
    name: 'Sosa Saunders1',
    gender: 'male',
    age: 17,
    email: 'sosa.saunders@mail.com',
    phone: '+1 (809) 435-2786',
    dateTime: '2023-01-15 12:12:11',
  },
  {
    id: '7',
    name: 'Angelina Kirk1',
    gender: 'female',
    age: 3,
    email: 'angelina@kirk.io',
    phone: '+1 (870) 567-3516',
    dateTime: '2023-01-15 12:12:11',
  },
  {
    id: '8',
    name: 'Bradford Rosales1',
    gender: 'male',
    age: 20,
    email: 'bradfordrosales@fast.com',
    phone: '+1 (918) 573-3240',
    dateTime: '2023-01-15 12:12:11',
  },
  {
    id: '9',
    name: 'Gwen Schroeder1',
    gender: 'female',
    age: 17,
    email: 'gwen@corp.xyz',
    phone: '+1 (987) 417-2062',
    dateTime: '2023-01-15 12:12:11',
  },
  {
    id: '10',
    name: 'Ellison Mann1',
    gender: 'male',
    age: 5,
    email: 'ellisonmann@katakana.com',
    phone: '+1 (889) 411-2186',
    dateTime: '2023-01-15 12:12:11',
  },
];

const columns: Array<{label: string; width: number; field: keyof TableData}> = [
  {
    label: 'Date/Time',
    field: 'dateTime',
    width: 22,
  },
  {
    label: 'Name',
    width: 20,
    field: 'name',
  },
  {
    label: 'Email',
    width: 30,
    field: 'email',
  },
  {
    label: 'Gender',
    width: 10,
    field: 'gender',
  },
];

function LiveTraderUI() {
  const {height, width} = useScreenSize();

  const [command, setCommand] = useState<string>('');

  const handleCommand = useCallback((command: string) => {
    switch (command) {
      case 'q':
        process.exit();
        break;
      default:
        break;
    }
  }, []);

  return (
    <>
      <Box flexDirection="row">
        <Box width="50%">
          <Table data={data} columns={columns} />
        </Box>
        <Separator height={(height || 0) - 0} />
        <Box width="50%">
          <Table data={data} columns={columns} />
        </Box>
      </Box>
      <StatusLine
        width={width || 0}
        elements={[
          {
            id: 'connected',
            text: 'CONNECTED',
            backgroundColor: 'green',
            color: 'black',
          },
          {id: 'balance', text: 'Balance: $10,000'},
          {id: 'trades', text: '123 Trades'},
        ]}
      />
      <Box>
        <Text>:</Text>
        <TextInput
          value={command}
          onChange={setCommand}
          onSubmit={value => {
            handleCommand(value);
            setCommand('');
          }}
        />
      </Box>
    </>
  );
}

export function run() {
  // enter full screen mode & and handle exit
  // const enterAltScreenCommand = '\x1b[?1049h';
  // const leaveAltScreenCommand = '\x1b[?1049l';
  // process.stdout.write(enterAltScreenCommand);
  // process.on('exit', () => {
  //   process.stdout.write(leaveAltScreenCommand);
  // });
  render(<LiveTraderUI />);
}
