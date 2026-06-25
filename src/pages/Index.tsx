import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect users from the root path to the login page.
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    null
  );
};

export default Index;
