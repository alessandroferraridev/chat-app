interface VerifyProps {
  token: string;
}

const VerifyPage: React.FC<VerifyProps> = ({ token }) => {
  return <>This is verify page {token}</>
}

export default VerifyPage;
