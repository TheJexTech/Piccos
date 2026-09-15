import { Container, SectionHeading } from "./landing-shell";
import { Reveal } from "./reveal";
import { SectionCard } from "@/components/ui/section-card";
import { Table, Th, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { sampleProducts } from "./sample-data";

export function ProductsSection() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <SectionHeading
              kicker="Products & Revenue"
              title="Keep your salon stocked and your products moving."
              description="Sell retail products alongside your services, and keep the revenue your salon depends on in view — all in the same place as everything else."
            />
          </Reveal>

          <Reveal delay={120}>
            <SectionCard title="Products">
              <Table>
                <thead>
                  <tr>
                    <Th>Product</Th>
                    <Th align="right">Stock</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {sampleProducts.map((p) => (
                    <tr key={p.name}>
                      <Td>{p.name}</Td>
                      <Td align="right">{p.stock}</Td>
                      <Td>
                        <StatusBadge status={p.status} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </SectionCard>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
