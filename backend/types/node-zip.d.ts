declare module 'node-zip' {
  interface ZipFile {
    files: {
      [key: string]: {
        _data: Buffer;
      };
    };
  }
  
  const NodeZip: {
    new (data: Buffer): ZipFile;
  };
  
  export = NodeZip;
} 