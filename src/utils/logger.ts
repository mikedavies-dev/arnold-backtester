import {format} from 'date-fns';

export default (module: string) => {
  return (message: string, ...args: any) => {
    console.log(
      `${format(new Date(), 'HH:mm:ss.SSS')} [${module}] `,
      message,
      ...args,
    );
  };
};
