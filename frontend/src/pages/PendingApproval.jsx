import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, Mail } from 'lucide-react';

const PendingApproval = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-100 p-4">
            <Card className="w-full max-w-md border-orange-200">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-orange-100 rounded-full">
                            <Clock className="w-12 h-12 text-orange-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-orange-900">Account Pending Approval</CardTitle>
                    <CardDescription className="text-orange-700">
                        Your account is waiting for admin verification
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-white p-4 rounded-lg border border-orange-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                            What happens next?
                        </h3>
                        <ol className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start">
                                <span className="font-bold mr-2">1.</span>
                                <span>An administrator will review your account details</span>
                            </li>
                            <li className="flex items-start">
                                <span className="font-bold mr-2">2.</span>
                                <span>You'll receive approval (usually within 24 hours)</span>
                            </li>
                            <li className="flex items-start">
                                <span className="font-bold mr-2">3.</span>
                                <span>Once approved, you can login and access the platform</span>
                            </li>
                        </ol>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <div className="flex items-start">
                            <Mail className="w-5 h-5 text-orange-600 mr-2 mt-0.5" />
                            <div className="text-sm text-orange-900">
                                <p className="font-semibold mb-1">Check your email</p>
                                <p className="text-orange-700">
                                    We'll notify you via email once your account has been approved by an administrator.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 space-y-3">
                        <Link to="/login" className="block">
                            <Button variant="outline" className="w-full">
                                Back to Login
                            </Button>
                        </Link>
                        <p className="text-center text-xs text-gray-500">
                            Need help? Contact your organization administrator
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PendingApproval;
