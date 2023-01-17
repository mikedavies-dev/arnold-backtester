import {useState, useCallback} from 'react';
import {format} from 'date-fns';

import {Box, render, Text} from 'ink';
import TextInput from 'ink-text-input';
import StatusLine from '../components/StatusLine';
import {Table} from '../components/Table';
import useInterval from '../../hooks/use-interval';

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
  const {height} = useScreenSize();

  const [command, setCommand] = useState<string>('');
  const [activeSymbols, setActiveSymbols] = useState<typeof data>([...data]);
  const [positions, setPositions] = useState<typeof data>([...data]);

  const handleCommand = useCallback((command: string) => {
    switch (command) {
      case 'q':
        process.exit();
        break;
      default:
        break;
    }
  }, []);

  useInterval(() => {
    const newData: Array<TableData> = Array(Math.ceil(Math.random() * 50))
      .fill(0)
      .map((_, ix) => {
        return {
          id: ix.toString(),
          name: Math.random().toString(),
          email: Math.random().toString(),
          gender: Math.random().toString(),
          phone: '',
          dateTime: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
          age: 1,
        };
      });
    setActiveSymbols(newData);

    const newPositions: Array<TableData> = Array(Math.ceil(Math.random() * 50))
      .fill(0)
      .map((_, ix) => {
        return {
          id: ix.toString(),
          name: Math.random().toString(),
          email: Math.random().toString(),
          gender: Math.random().toString(),
          phone: '',
          dateTime: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
          age: 1,
        };
      });
    setPositions(newPositions);
  }, 1000);

  return (
    <>
      <Box flexDirection="row">
        <Box width="50%">
          <Table data={activeSymbols} columns={columns} />
        </Box>
        <Separator height={(height || 0) - 2} />
        <Box width="50%">
          <Table data={positions} columns={columns} />
        </Box>
      </Box>
      <StatusLine
        left={[
          {id: 'balance', text: `$${Math.random().toFixed(2)}`},
          {id: 'trades', text: `Trades: ${Math.ceil(Math.random() * 100)}`},
        ]}
        right={[
          {id: 'p&l', text: 'P&L: -123.12', color: 'red'},
          {
            id: 'connected',
            text: 'CONNECTED',
            color: 'green',
          },
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
  const enterAltScreenCommand = '\x1b[?1049h';
  const leaveAltScreenCommand = '\x1b[?1049l';
  process.stdout.write(enterAltScreenCommand);
  process.on('exit', () => {
    process.stdout.write(leaveAltScreenCommand);
  });
  render(<LiveTraderUI />);
}
