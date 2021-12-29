import moment from 'moment-timezone';

export default (module: string) => {
  return (message: string, ...args: any) => {
    console.log(
      `${moment().format('HH:mm:ss.SSS')} [${module}] `,
      message,
      ...args,
    );
  };
};
