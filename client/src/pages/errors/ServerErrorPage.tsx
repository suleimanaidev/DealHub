import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';

export default function ServerErrorPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-bold text-gray-900 dark:text-white">500</h1>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Server error</p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
        Something went wrong on our end. Please try again later.
      </p>
      <Link to="/" className="mt-6">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
