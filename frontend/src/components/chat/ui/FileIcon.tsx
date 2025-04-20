import React from 'react';
import { 
  AiOutlineFile, 
  AiOutlineFileText, 
  AiOutlineFilePdf, 
  AiOutlineFileExcel, 
  AiOutlineFilePpt, 
  AiOutlineFileWord,
  AiOutlineFileImage,
  AiOutlineFileZip
} from 'react-icons/ai';

interface FileIconProps {
  type?: string;
  fileName?: string;
}

const getFileType = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  if (['pdf'].includes(extension)) return 'pdf';
  if (['doc', 'docx', 'rtf'].includes(extension)) return 'word';
  if (['xls', 'xlsx', 'csv'].includes(extension)) return 'excel';
  if (['ppt', 'pptx'].includes(extension)) return 'powerpoint';
  if (['txt', 'md'].includes(extension)) return 'text';
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) return 'image';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return 'zip';
  
  return 'generic';
};

const FileIcon: React.FC<FileIconProps> = ({ type, fileName }) => {
  // ถ้ามี fileName ให้ใช้ fileName ในการตรวจสอบประเภทไฟล์
  const fileType = fileName ? getFileType(fileName) : (type || 'generic');
  
  if (fileType.includes('pdf')) return <AiOutlineFilePdf className="w-5 h-5 text-red-500" />;
  if (fileType.includes('word')) return <AiOutlineFileWord className="w-5 h-5 text-blue-500" />;
  if (fileType.includes('excel') || fileType.includes('csv')) return <AiOutlineFileExcel className="w-5 h-5 text-green-500" />;
  if (fileType.includes('powerpoint')) return <AiOutlineFilePpt className="w-5 h-5 text-orange-500" />;
  if (fileType.includes('text')) return <AiOutlineFileText className="w-5 h-5 text-gray-500" />;
  if (fileType.includes('image')) return <AiOutlineFileImage className="w-5 h-5 text-purple-500" />;
  if (fileType.includes('zip')) return <AiOutlineFileZip className="w-5 h-5 text-yellow-500" />;
  
  return <AiOutlineFile className="w-5 h-5 text-gray-500" />;
};

export default FileIcon; 