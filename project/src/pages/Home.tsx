import Header from '../components/Header';
// import Footer from '../components/Footer';
import Hero from '../components/Hero';
import TrendingMovies from '../components/trendingMovies';
import AdBanner from '../components/AdBanner';
import FixedAdBanner from '../components/FixedAdBanner';
import MiddleAdBanner from '../components/MiddleAdBanner';
import PageWrapper from '../components/PageWrapper';

const Home = () => {
  return (
    <div className="min-h-screen bg-black">
      <PageWrapper>
        <Header />
        <Hero />
        <MiddleAdBanner />
        <TrendingMovies />
        {/* <Footer /> */}
        <FixedAdBanner />
      </PageWrapper>
      <AdBanner />
      
    </div>
  );
};

export default Home;