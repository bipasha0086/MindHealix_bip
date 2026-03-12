import React from 'react';
import PageContainer from '../layout/PageContainer';

const AuthSplitLayout = ({ left, right, className = '' }) => {
  return (
    <div className={`min-h-screen py-10 px-4 sm:py-14 ${className}`}>
      <PageContainer className="max-w-6xl">
        <div className="grid lg:grid-cols-[1.05fr,0.95fr] gap-8 items-stretch">
          <section className="feature-glass rounded-3xl p-7 sm:p-9 border border-cyan-100">{left}</section>
          <section className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-7">{right}</section>
        </div>
      </PageContainer>
    </div>
  );
};

export default AuthSplitLayout;
